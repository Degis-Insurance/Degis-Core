// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../utils/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "../libraries/SafePRBMath.sol";

import "./interfaces/IRandomNumberGenerator.sol";

contract DegisLottery is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using SafePRBMath for uint256;

    IRandomNumberGenerator randomGenerator;

    address public injectorAddress;
    address public operatorAddress;
    address public treasuryAddress;

    uint256 public currentLotteryId;

    uint256 public currentTicketId;

    uint256 public MIN_LENGTH = 1 hours;
    uint256 public MAX_LENGTH = 60 days;

    uint32 public constant MAX_TICKET_NUMBER = 19999;
    uint32 public constant MIN_TICKET_NUMBER = 10000;

    uint256 public maxTicketsPerTx = 50;

    IERC20 public degis;
    IERC20 public USD;

    enum Status {
        Pending,
        Open,
        Close,
        Claimbale
    }

    struct LotteryInfo {
        Status status;
        uint256 lotteryId;
        uint256 startTime;
        uint256 endTime;
        uint256 ticketPrice;
        uint256[4] rewardsBreakdown;
        uint256[4] rewardPerTicket;
        uint256 rewardAmount;
        uint256 pendingReward;
        uint32 finalNumber;
    }
    mapping(uint256 => LotteryInfo) private lotteryList;

    struct TicketInfo {
        uint32 number;
        bool isRedeemed;
        uint256 buyLotteryId;
        uint256 redeemLotteryId;
        uint256 price;
        address owner;
    }
    mapping(uint256 => TicketInfo) private ticketList;

    mapping(address => uint256[]) private userTickets;

    // LotteryId => Ticket Number => Amount of this number
    mapping(uint256 => mapping(uint32 => uint256)) certainTicketAmountPerLotteryId;

    // Bracket calculator is used for verifying claims for ticket prizes
    mapping(uint32 => uint32) private _bracketCalculator;

    event RandomGeneratorChanged(address oldGenerator, address newGenerator);

    event TicketsPurchased(
        address buyerAddress,
        uint256 lotteryId,
        uint256 startTicketId,
        uint256 endTicketId
    );

    event EmergencyWithdraw(address indexed tokenAddress, uint256 amount);

    event LotteryFundInjection(uint256 lotteryId, uint256 amount);

    /**
     * @notice Constructor function
     * @dev RandomNumberGenerator must be deployed prior to this contract
     * @param _degisTokenAddress Address of the DEGIS token (for buying tickets)
     * @param _usdcTokenAddress Address of the USDC token (for prize distribution)
     * @param _randomGeneratorAddress Address of the RandomGenerator contract used to work with ChainLink VRF
     */
    constructor(
        address _degisTokenAddress,
        address _usdcTokenAddress,
        address _randomGeneratorAddress
    ) {
        degis = IERC20(_degisTokenAddress);
        USD = IERC20(_usdcTokenAddress);
        randomGenerator = IRandomNumberGenerator(_randomGeneratorAddress);

        // Initializes the bracketCalculator, constant numbers
        _bracketCalculator[0] = 1;
        _bracketCalculator[1] = 11;
        _bracketCalculator[2] = 111;
        _bracketCalculator[3] = 1111;
    }

    modifier notContract() {
        require(!_isContract(msg.sender), "Contract not allowed");
        require(msg.sender == tx.origin, "Proxy contract not allowed");
        _;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ View Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Get a lottery's information
     */
    function getLotteryInfo(uint256 _lotteryId)
        external
        view
        returns (LotteryInfo memory)
    {
        return lotteryList[_lotteryId];
    }

    /**
     * @notice Get all lotteries' information
     */
    function getAllLotteryInfo() external view returns (LotteryInfo[] memory) {
        LotteryInfo[] memory allLotteries = new LotteryInfo[](currentLotteryId);
        for (uint256 i = 1; i <= currentLotteryId; i++) {
            allLotteries[i - 1] = lotteryList[i];
        }
        return allLotteries;
    }

    /**
     * @notice Get a ticket's information
     */
    function getTicketInfo(uint256 _ticketId)
        external
        view
        returns (TicketInfo memory)
    {
        return ticketList[_ticketId];
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Set Functions ************************************* //
    // ---------------------------------------------------------------------------------------- //

    function setRandomGenerator(address _randomGenerator) external onlyOwner {
        address oldGenerator = address(randomGenerator);
        randomGenerator = IRandomNumberGenerator(_randomGenerator);
        emit RandomGeneratorChanged(oldGenerator, _randomGenerator);
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    function buyTickets(
        uint32[] calldata _ticketNumbers,
        uint256[] calldata _ticketAmounts
    ) external nonReentrant {
        // Gas saving
        // Note: CALLDATALOAD 3 gas, CALLDATASIZE 2 gas, MLOAD & MSTORE 3 gas
        uint256 ticketAmount = _ticketNumbers.length;
        require(ticketAmount != 0, "No tickets are being bought");

        require(
            ticketAmount == _ticketAmounts.length,
            "length of ticket number and amount are different"
        );

        require(
            ticketAmount <= maxTicketsPerTx,
            "Too many tickets are bought at one time"
        );

        require(
            lotteryList[currentLotteryId].status == Status.Open,
            "Current lottery is not open"
        );

        uint256 degisAmountToPay = lotteryList[currentLotteryId].ticketPrice *
            ticketAmount;

        degis.safeTransferFrom(_msgSender(), address(this), degisAmountToPay);

        uint256 startTicketId = currentTicketId;

        for (uint256 i = 0; i < ticketAmount; i++) {
            uint32 number = _ticketNumbers[i];

            require(
                number >= MIN_TICKET_NUMBER && number <= MAX_TICKET_NUMBER,
                "Ticket number is out of range"
            );

            // Used when drawing prizes
            certainTicketAmountPerLotteryId[currentLotteryId][
                1 + (number % 10)
            ]++;
            certainTicketAmountPerLotteryId[currentLotteryId][
                11 + (number % 100)
            ]++;
            certainTicketAmountPerLotteryId[currentLotteryId][
                111 + (number % 1000)
            ]++;
            certainTicketAmountPerLotteryId[currentLotteryId][
                1111 + (number % 10000)
            ]++;

            // Update user's record
            userTickets[_msgSender()].push(currentTicketId);

            // Store this ticket number to global ticket state
            ticketList[currentTicketId] = TicketInfo({
                number: number,
                owner: _msgSender(),
                buyLotteryId: currentLotteryId,
                isRedeemed: false,
                redeemLotteryId: 0,
                price: lotteryList[currentLotteryId].ticketPrice
            });

            // Increase the global ticket id
            currentTicketId++;
        }

        emit TicketsPurchased(
            _msgSender(),
            currentLotteryId,
            startTicketId,
            currentTicketId - 1
        );
    }

    function redeemTickets(uint256[] calldata _ticketIds) external {}

    function claimTickets(uint256 _lotteryId, uint256[] calldata _ticketIds)
        external
    {}

    function claimAllTickets(uint256 _lotteryId) external {}

    function startLottery(
        uint256 _endTime,
        uint256 _ticketPrice,
        uint256[4] calldata _rewardsBreakdown,
        uint256 _treasuryFee
    ) external {}

    function closeLottery(uint256 _lotteryId) external {}

    function injectFunds(uint256 _amount) external nonReentrant {
        require(
            lotteryList[currentLotteryId].status == Status.Open,
            "Current lottery round is not open"
        );

        USD.safeTransferFrom(_msgSender(), address(this), _amount);

        lotteryList[currentLotteryId].pendingReward += _amount;

        require(
            lotteryList[currentLotteryId].pendingReward <=
                USD.balanceOf(address(this)),
            "the amount is wrong"
        );

        emit LotteryFundInjection(currentLotteryId, _amount);
    }

    function drawFinalNumber(uint256 _lotteryId, bool _autoInjection)
        external
    {}

    function emergencyWithdraw(address _tokenAddress, uint256 _amount)
        external
        onlyOwner
    {
        require(
            _tokenAddress != address(degis),
            "Can not withdraw degis tokens"
        );

        IERC20(_tokenAddress).safeTransfer(owner(), _amount);

        emit EmergencyWithdraw(_tokenAddress, _amount);
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Internal Functions ********************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Check if an address is a contract
     */
    function _isContract(address _addr) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(_addr)
        }
        return size > 0;
    }
}
