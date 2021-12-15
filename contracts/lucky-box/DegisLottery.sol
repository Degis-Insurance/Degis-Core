// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../utils/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../libraries/SafePRBMath.sol";

contract DegisLottery is Ownable {
    using SafeERC20 for IERC20;
    using SafePRBMath for uint256;

    address public injectorAddress;
    address public operatorAddress;
    address public treasuryAddress;

    uint256 public currentLotteryId;

    uint256 public currentTicketId;

    uint256 public MIN_LENGTH = 1 hours;
    uint256 public MAX_LENGTH = 60 days;

    IERC20 public degis;
    IERC20 public USDC;

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

    // Bracket calculator is used for verifying claims for ticket prizes
    mapping(uint32 => uint32) private _bracketCalculator;

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
        USDC = IERC20(_usdcTokenAddress);
        randomGenerator = IRandomNumberGenerator(_randomGeneratorAddress);

        // Initializes the bracketCalculator, constant numbers
        _bracketCalculator[0] = 1;
        _bracketCalculator[1] = 11;
        _bracketCalculator[2] = 111;
        _bracketCalculator[3] = 1111;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ View Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    function getLotteryInfo(uint256 _lotteryId)
        external
        view
        returns (LotteryInfo memory)
    {
        return lotteryList[_lotteryId];
    }

    function getAllLotteryInfo() external view returns (LotteryInfo[] memory) {
        LotteryInfo[] memory allLotteries = new LotteryInfo[](currentLotteryId);
        for (uint256 i = 1; i <= currentLotteryId; i++) {
            allLotteries[i - 1] = lotteryList[i];
        }
        return allLotteries;
    }

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

    function setRandomGenerator(address _randomGenerator) external onlyOwner {}

    function setTicketPrice(uint256 _newPrice) external onlyOwner {}

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    function buyTickets(uint32[] calldata _ticketNumbers) external {}

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

    function injectFunds(uint256 _lotteryId, uint256 _amount) external {}

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

        require(
            IERC20(_tokenAddress).balanceOf(address(this)) >= _amount,
            "Withdraw amount exceeds balance"
        );
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Internal Functions ********************************* //
    // ---------------------------------------------------------------------------------------- //
}
