// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "../utils/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IRandomNumberGenerator.sol";

import "hardhat/console.sol";

contract DegisLottery is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Variables **************************************** //
    // ---------------------------------------------------------------------------------------- //

    IERC20 public DEGToken;
    IERC20 public USDToken;
    IRandomNumberGenerator public randomGenerator;

    address public operatorAddress;

    uint256 public constant TICKET_PRICE = 10 ether;

    struct Tickets {
        mapping(uint256 => uint256) ticketsWeight;
        mapping(uint256 => uint256) ticketsAmount;
    }
    Tickets poolTickets;
    mapping(address => Tickets) usersTickets;

    enum Status {
        Pending,
        Open,
        Close,
        Claimable
    }
    struct LotteryInfo {
        Status status;
        uint256 startTime;
        uint256 endTime;
        uint256[4] stageProportion;
        uint256[4] stageReward;
        uint256[4] stageAmount;
        uint256[4] stageWeight;
        uint256 totalRewards;
        uint256 pendingRewards;
        uint256 finalNumber;
    }
    mapping(uint256 => LotteryInfo) public lotteries;

    uint256 public RewardsToNextLottery;

    uint256 public allPendingRewards;

    uint256 public currentLotteryId; // Total Rounds

    mapping(address => uint256) public userCheckPoint;
    mapping(address => uint256) public usersTotalRewards;

    mapping(address => mapping(uint256 => uint256)) public usersRewards;

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Events ***************************************** //
    // ---------------------------------------------------------------------------------------- //

    event TicketsPurchase(
        address indexed buyer,
        uint256 indexed lotteryId,
        uint256 totalAmount
    );
    event TicketsRedeem(
        address indexed redeemer,
        uint256 indexed lotteryId,
        uint256 totalAmount
    );
    event LotteryOpen(
        uint256 indexed lotteryId,
        uint256 startTime,
        uint256 endTime,
        uint256 totalRewards
    );
    event LotteryNumberDrawn(
        uint256 indexed lotteryId,
        uint256 finalNumber,
        uint256 pendingRewards
    );

    event ReceiveRewards(
        address indexed claimer,
        uint256 amount,
        uint256 indexed lotteryId
    );

    event LotteryClose(uint256 indexed lotteryId);

    event LotteryFundInjection(
        uint256 indexed lotteryId,
        uint256 injectedAmount
    );
    event RandomNumberGeneratorChanged(address randomGenerator);
    event OperatorAddressChanged(address operator);
    event AdminTokenRecovery(address indexed token, uint256 amount);

    /**
     * @notice Constructor function
     * @dev RandomNumberGenerator must be deployed prior to this contract
     * @param _DEGTokenAddress Address of the DEG token (for buying tickets)
     * @param _USDTokenAddress Address of the USD token (for prize distribution)
     * @param _randomGeneratorAddress Address of the RandomGenerator contract used to work with ChainLink VRF
     */
    constructor(
        address _DEGTokenAddress,
        address _USDTokenAddress,
        address _randomGeneratorAddress
    ) {
        DEGToken = IERC20(_DEGTokenAddress);
        USDToken = IERC20(_USDTokenAddress);
        randomGenerator = IRandomNumberGenerator(_randomGeneratorAddress);
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************** Modifiers *************************************** //
    // ---------------------------------------------------------------------------------------- //

    modifier notContract() {
        require(!_isContract(_msgSender()), "Contract not allowed");
        require(_msgSender() == tx.origin, "Proxy contract not allowed");
        _;
    }

    modifier onlyOperator() {
        require(
            _msgSender() == operatorAddress || _msgSender() == owner(),
            "Not operator"
        );
        _;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ View Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    function getCurrentRoundWeight() public view returns (uint256) {
        return ((currentLotteryId + 24) * 1000000) / (currentLotteryId + 12);
    }

    /**
     * @notice Get pool tickets info
     * @dev May be a huge number, avoid reading this frequently
     * @param _startIndex Start number
     * @param _stopIndex Stop number
     * @param _position Which level to check (0, 1, 2, 3), use 0 to check the 4-digit number
     */
    function getPoolTicketsInfo(
        uint256 _startIndex,
        uint256 _stopIndex,
        uint256 _position
    )
        external
        view
        returns (
            uint256[] memory,
            uint256[] memory,
            uint256[] memory
        )
    {
        uint256[] memory ticketsNumber = new uint256[](
            _stopIndex - _startIndex + 1
        );
        uint256[] memory ticketsAmount = new uint256[](
            _stopIndex - _startIndex + 1
        );
        uint256[] memory ticketsWeight = new uint256[](
            _stopIndex - _startIndex + 1
        );

        for (uint256 i = _startIndex; i <= _stopIndex; i++) {
            uint256 encodedNumber = _encodedNumber(i, _position);

            ticketsNumber[i - _startIndex] = i;
            ticketsAmount[i - _startIndex] = poolTickets.ticketsAmount[
                encodedNumber
            ];
            ticketsWeight[i - _startIndex] = poolTickets.ticketsWeight[
                encodedNumber
            ];
        }
        return (ticketsNumber, ticketsAmount, ticketsWeight);
    }

    /**
     * @notice Get user tickets info
     */
    function getUserTicketsInfo(
        address user,
        uint256 _startIndex,
        uint256 _stopIndex,
        uint256 position
    )
        external
        view
        returns (
            uint256[] memory,
            uint256[] memory,
            uint256[] memory
        )
    {
        uint256 length = _stopIndex - _startIndex + 1;

        uint256[] memory ticketsNumber = new uint256[](length);
        uint256[] memory ticketsAmount = new uint256[](length);
        uint256[] memory ticketsWeight = new uint256[](length);

        for (uint256 i = _startIndex; i <= _stopIndex; i++) {
            uint256 encodedNumber = _encodedNumber(i, position);
            ticketsNumber[i - _startIndex] = i;
            ticketsAmount[i - _startIndex] = usersTickets[user].ticketsAmount[
                encodedNumber
            ];
            ticketsWeight[i - _startIndex] = usersTickets[user].ticketsWeight[
                encodedNumber
            ];
        }
        return (ticketsNumber, ticketsAmount, ticketsWeight);
    }

    /**
     * @notice Get lottery stage info
     */
    function getLotteriesStageInfo(uint256 _lotteryId)
        external
        view
        returns (
            uint256[] memory stageProportion,
            uint256[] memory stageReward,
            uint256[] memory stageAmount,
            uint256[] memory stageWeight
        )
    {
        stageProportion = new uint256[](4);
        stageReward = new uint256[](4);
        stageAmount = new uint256[](4);
        stageWeight = new uint256[](4);

        for (uint256 i = 0; i < 4; i++) {
            stageProportion[i] = lotteries[_lotteryId].stageProportion[i];
            stageReward[i] = lotteries[_lotteryId].stageReward[i];
            stageAmount[i] = lotteries[_lotteryId].stageAmount[i];
            stageWeight[i] = lotteries[_lotteryId].stageWeight[i];
        }
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Set Functions ************************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Set operator, treasury, and injector addresses
     * @dev Only callable by the owner
     * @param _operatorAddress address of the operator
     */
    function setOperatorAddress(address _operatorAddress) external onlyOwner {
        require(_operatorAddress != address(0), "Cannot be zero address");

        operatorAddress = _operatorAddress;

        emit OperatorAddressChanged(_operatorAddress);
    }

    function setRandomNumberGenerator(address _randomNumberGenerator)
        external
        onlyOwner
    {
        require(
            _randomNumberGenerator != address(0),
            "Can not be zero address"
        );

        randomGenerator = IRandomNumberGenerator(_randomNumberGenerator);

        emit RandomNumberGeneratorChanged(_randomNumberGenerator);
    }

    /**
     * @notice Change the end time of current round (only if it was set a wrong number)
     */
    function setEndTime(uint256 _endTime) external onlyOwner {
        require(
            lotteries[currentLotteryId].status == Status.Open,
            "Only change endtime when Lottery open"
        );

        lotteries[currentLotteryId].endTime = _endTime;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Start the lottery
     * @dev Callable only by operator
     * @param _endTime endTime of the lottery (timestamp in s)
     * @param _stageProportion breakdown of rewards per bracket (must sum to 10,000)(100 <=> 1)
     */
    function startLottery(
        uint256 _endTime,
        uint256[4] calldata _stageProportion
    ) external onlyOperator {
        require(
            (currentLotteryId == 0) ||
                (lotteries[currentLotteryId].status == Status.Claimable),
            "Not time to start lottery"
        );

        require(
            (_stageProportion[0] +
                _stageProportion[1] +
                _stageProportion[2] +
                _stageProportion[3]) <= 10000,
            "Total rewards of each bracket should <= 10000"
        );

        currentLotteryId++;

        lotteries[currentLotteryId] = LotteryInfo({
            status: Status.Open,
            startTime: block.timestamp,
            endTime: _endTime,
            stageProportion: _stageProportion,
            stageReward: [uint256(0), uint256(0), uint256(0), uint256(0)],
            stageAmount: [uint256(0), uint256(0), uint256(0), uint256(0)],
            stageWeight: [uint256(0), uint256(0), uint256(0), uint256(0)],
            totalRewards: RewardsToNextLottery,
            pendingRewards: 0,
            finalNumber: 0
        });
        RewardsToNextLottery = 0;

        emit LotteryOpen(
            currentLotteryId,
            lotteries[currentLotteryId].startTime,
            lotteries[currentLotteryId].endTime,
            lotteries[currentLotteryId].totalRewards
        );
    }

    /**
     * @notice Close a lottery
     * @dev Callable by any address and need to meet the endtime condition
     */
    function closeLottery() external nonReentrant {
        require(
            lotteries[currentLotteryId].status == Status.Open,
            "Current lottery is not open"
        );

        require(
            block.timestamp >= lotteries[currentLotteryId].endTime,
            "Not time to close lottery"
        );

        lotteries[currentLotteryId].endTime = block.timestamp;

        // Request a random number from the generator
        randomGenerator.getRandomNumber();

        // Update the lottery status
        lotteries[currentLotteryId].status = Status.Close;

        emit LotteryClose(currentLotteryId);
    }

    /**
     * @notice Buy tickets for the current lottery round
     * @dev Can not be called by a smart contract
     * @param _ticketNumbers array of ticket numbers between 0 and 9999
     * @param _ticketAmounts array of ticket amount
     */
    function buyTickets(
        uint256[] calldata _ticketNumbers,
        uint256[] calldata _ticketAmounts
    ) external notContract nonReentrant {
        require(_ticketNumbers.length != 0, "No tickets are being bought");
        require(
            _ticketNumbers.length == _ticketAmounts.length,
            "Different lengths"
        );

        require(
            lotteries[currentLotteryId].status == Status.Open,
            "Current lottery is not open"
        );

        if (userCheckPoint[_msgSender()] == 0) {
            userCheckPoint[_msgSender()] = currentLotteryId;
        }

        if (userCheckPoint[_msgSender()] < currentLotteryId) {
            receiveRewards(currentLotteryId - 1);
        }

        uint256 roundWeight = getCurrentRoundWeight();

        uint256 totalAmount = 0;

        for (uint256 i = 0; i < _ticketNumbers.length; i++) {
            _buyTicket(
                poolTickets,
                _ticketNumbers[i],
                _ticketAmounts[i],
                roundWeight * _ticketAmounts[i]
            );
            _buyTicket(
                usersTickets[_msgSender()],
                _ticketNumbers[i],
                _ticketAmounts[i],
                roundWeight * _ticketAmounts[i]
            );
            totalAmount += _ticketAmounts[i];
        }

        DEGToken.safeTransferFrom(
            address(_msgSender()),
            address(this),
            totalAmount * TICKET_PRICE
        );

        emit TicketsPurchase(_msgSender(), currentLotteryId, totalAmount);
    }

    /**
     * @notice Redeem tickets for all lottery
     * @param _ticketNumbers Array of ticket numbers
     * @dev Callable by users
     */
    function redeemTickets(uint256[] calldata _ticketNumbers)
        external
        notContract
        nonReentrant
    {
        require(_ticketNumbers.length != 0, "No tickets are being redeem");

        require(
            lotteries[currentLotteryId].status == Status.Open,
            "Sorry, current lottery is not open"
        );

        if (userCheckPoint[msg.sender] < currentLotteryId) {
            receiveRewards(currentLotteryId - 1);
        }

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _ticketNumbers.length; i++) {
            uint256 encodedNumber = _encodedNumber(_ticketNumbers[i], 3);

            uint256 ticketAmount = usersTickets[msg.sender].ticketsAmount[
                encodedNumber
            ];
            uint256 ticketWeight = usersTickets[msg.sender].ticketsWeight[
                encodedNumber
            ];
            _redeemTicket(
                poolTickets,
                _ticketNumbers[i],
                ticketAmount,
                ticketWeight
            );
            _redeemTicket(
                usersTickets[_msgSender()],
                _ticketNumbers[i],
                ticketAmount,
                ticketWeight
            );
            totalAmount += ticketAmount;
        }

        require(totalAmount != 0, "No tickets are being redeemed");

        DEGToken.safeTransfer(_msgSender(), totalAmount * TICKET_PRICE);

        emit TicketsRedeem(_msgSender(), currentLotteryId, totalAmount);
    }

    /**
     * @notice Inject funds
     * @param _amount amount to inject 
     * @dev Callable by owner(incentive) or injector address(insurancePool income)
            First transfer USD and then call this function to record
     */
    function injectFunds(uint256 _amount) external onlyOperator nonReentrant {
        USDToken.safeTransferFrom(_msgSender(), address(this), _amount);

        if (lotteries[currentLotteryId].status == Status.Open) {
            lotteries[currentLotteryId].totalRewards += _amount;
        } else RewardsToNextLottery += _amount;

        // tag: This place may need change
        require(
            allPendingRewards + lotteries[currentLotteryId].totalRewards <=
                USDToken.balanceOf(address(this)),
            "Wrong USD amount"
        );

        emit LotteryFundInjection(currentLotteryId, _amount);
    }

    /**
     * @notice Draw the final number, calculate reward in DEG for each group,
     *         and make this lottery claimable (need to wait for the random generator)
     * @dev Callable by any address
     */
    function drawLottery() external nonReentrant {
        require(
            lotteries[currentLotteryId].status == Status.Close,
            "this lottery has not closed, you should first close it"
        );
        require(
            currentLotteryId == randomGenerator.latestLotteryId(),
            "the final number has not been drawn"
        );

        // Get the final lucky numbers from randomGenerator
        uint256 finalNumber = randomGenerator.randomResult();

        uint256 lastAmount = 0;
        uint256 lastWeight = 0;

        LotteryInfo storage currentLottery = lotteries[currentLotteryId];

        uint256 tempPendingRewards = 0;

        for (uint256 j = 0; j < 4; j++) {
            uint256 i = 3 - j;

            uint256 encodedNumber = _encodedNumber(finalNumber, i);

            currentLottery.stageAmount[i] =
                poolTickets.ticketsAmount[encodedNumber] -
                lastAmount;
            lastAmount = poolTickets.ticketsAmount[encodedNumber];

            currentLottery.stageWeight[i] =
                poolTickets.ticketsWeight[encodedNumber] -
                lastWeight;
            lastWeight = poolTickets.ticketsWeight[encodedNumber];

            if (currentLottery.stageAmount[i] == 0)
                currentLottery.stageReward[i] = 0;
            else
                currentLottery.stageReward[i] =
                    (currentLottery.stageProportion[i] *
                        currentLottery.totalRewards) /
                    10000;

            tempPendingRewards += currentLottery.stageReward[i];
        }
        currentLottery.pendingRewards += tempPendingRewards;

        RewardsToNextLottery =
            currentLottery.totalRewards -
            currentLottery.pendingRewards;

        require(
            allPendingRewards + currentLottery.totalRewards <=
                USDToken.balanceOf(address(this)),
            "Wrong USD amount"
        );

        // Update internal statuses for this lottery round
        currentLottery.finalNumber = finalNumber;
        currentLottery.status = Status.Claimable;

        // Update all pending rewards
        allPendingRewards += currentLottery.pendingRewards;

        emit LotteryNumberDrawn(
            currentLotteryId,
            finalNumber, // final result for this round
            lotteries[currentLotteryId].pendingRewards
        );
    }

    /**
     * @notice Receive award from a lottery
     * @param _lotteryId lottery id
     * @param user user address
     */
    function receiveReward(uint256 _lotteryId, address user)
        public
        view
        returns (uint256)
    {
        uint256 award = 0;
        uint256 lastWeight = 0;
        uint256 finalNumber = lotteries[_lotteryId].finalNumber;
        for (uint256 j = 0; j < 4; j++) {
            uint256 i = 3 - j;
            uint256 encodedNumber = _encodedNumber(finalNumber, i);
            uint256 weight = usersTickets[user].ticketsWeight[encodedNumber] -
                lastWeight;
            lastWeight = usersTickets[user].ticketsWeight[encodedNumber];
            if (lotteries[_lotteryId].stageWeight[i] != 0) {
                award +=
                    (lotteries[_lotteryId].stageReward[i] * weight) /
                    lotteries[_lotteryId].stageWeight[i];
            }
        }

        return award;
    }

    /**
     * @notice Receive all awards from lottery before lottery id
     * @param _lotteryId lottery id
     * @dev Callable by users only, not contract!
     */
    function receiveRewards(uint256 _lotteryId) public notContract {
        require(
            lotteries[_lotteryId].status == Status.Claimable,
            "this round of lottery are not ready for claiming"
        );

        require(
            userCheckPoint[msg.sender] <= _lotteryId,
            "all awards have been received"
        );

        uint256 awards = 0;

        for (uint256 i = userCheckPoint[msg.sender]; i <= _lotteryId; i++) {
            uint256 award = receiveReward(i, msg.sender);
            awards += award;
            lotteries[i].pendingRewards -= award;

            usersRewards[msg.sender][i] = award;
            usersTotalRewards[msg.sender] += award;
        }
        userCheckPoint[msg.sender] = _lotteryId + 1;

        allPendingRewards -= awards;

        // require(awards != 0, "no awards");

        // Transfer the prize to winner
        if (awards != 0) {
            USDToken.safeTransfer(msg.sender, awards);
        }
        emit ReceiveRewards(msg.sender, awards, _lotteryId);
    }

    /**
     * @notice Recover wrong tokens sent to the contract, only by the owner
               All tokens except DEG and USD are wrong tokens
     * @param _tokenAddress the address of the token to withdraw
     * @param _tokenAmount token amount to withdraw
     */
    function recoverWrongTokens(address _tokenAddress, uint256 _tokenAmount)
        external
        onlyOwner
    {
        require(_tokenAddress != address(DEGToken), "Cannot recover DEG token");

        IERC20(_tokenAddress).safeTransfer(address(msg.sender), _tokenAmount);

        emit AdminTokenRecovery(_tokenAddress, _tokenAmount);
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Internal Functions ********************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Update the status to finish buying a ticket
     * @param tickets Tickets to update
     * @param _ticketNumber Original number of the ticket
     * @param _ticketAmount Amount of this number are being bought
     * @param _ticketWeight Weight of this ticket, depends on round
     */
    function _buyTicket(
        Tickets storage tickets,
        uint256 _ticketNumber,
        uint256 _ticketAmount,
        uint256 _ticketWeight
    ) internal {
        for (uint256 i = 0; i < 4; i++) {
            uint256 encodedNumber = _encodedNumber(_ticketNumber, i);
            tickets.ticketsWeight[encodedNumber] += _ticketWeight;
            tickets.ticketsAmount[encodedNumber] += _ticketAmount;
        }
    }

    /**
     * @notice Update the status to finish redeeming a ticket
     * @param tickets Tickets to update
     * @param _ticketNumber Original number of the ticket
     * @param _ticketAmount Amount of this number are being redeemed
     * @param _ticketWeight Weight of this ticket, depends on round
     */
    function _redeemTicket(
        Tickets storage tickets,
        uint256 _ticketNumber,
        uint256 _ticketAmount,
        uint256 _ticketWeight
    ) internal {
        for (uint256 i = 0; i < 4; i++) {
            uint256 encodedNumber = _encodedNumber(_ticketNumber, i);
            tickets.ticketsWeight[encodedNumber] -= _ticketWeight;
            tickets.ticketsAmount[encodedNumber] -= _ticketAmount;
        }
    }

    /**
     * @notice Get the encoded number form
     * @param _number The original number
     * @param _position The number's position/level (0, 1, 2, 3)
     */
    function _encodedNumber(uint256 _number, uint256 _position)
        internal
        pure
        returns (uint256)
    {
        return (_number % (10**(_position + 1))) + _position * 10000;
    }

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

    function _viewUserTicetAmount(address user, uint256 encodedNumber)
        internal
        view
        returns (uint256)
    {
        return usersTickets[user].ticketsAmount[encodedNumber];
    }

    function _viewUserTicetWeight(address user, uint256 encodedNumber)
        internal
        view
        returns (uint256)
    {
        return usersTickets[user].ticketsWeight[encodedNumber];
    }

    function viewUserAllTicketsInfo(address user, uint256 maxAmount)
        external
        view
        returns (
            uint256[] memory,
            uint256[] memory,
            uint256[] memory,
            uint256
        )
    {
        uint256[] memory ticketsNumber = new uint256[](maxAmount);
        uint256[] memory ticketsAmount = new uint256[](maxAmount);
        uint256[] memory ticketsWeight = new uint256[](maxAmount);

        uint256 amount = 0;
        uint256 number = 0;
        uint256 i0 = 0;
        uint256 i1 = 0;
        uint256 i2 = 0;
        uint256 i3 = 0;

        for (i0 = 0; i0 <= 9; i0++) {
            number = i0;
            if (_viewUserTicetAmount(user, _encodedNumber(number, 0)) == 0)
                continue;
            for (i1 = 0; i1 <= 9; i1++) {
                number = i0 + i1 * 10;
                if (_viewUserTicetAmount(user, _encodedNumber(number, 1)) == 0)
                    continue;
                for (i2 = 0; i2 <= 9; i2++) {
                    number = i0 + i1 * 10 + i2 * 100;
                    if (
                        _viewUserTicetAmount(user, _encodedNumber(number, 2)) ==
                        0
                    ) continue;
                    for (i3 = 0; i3 <= 9; i3++) {
                        number = i0 + i1 * 10 + i2 * 100 + i3 * 1000;
                        if (
                            _viewUserTicetAmount(
                                user,
                                _encodedNumber(number, 3)
                            ) == 0
                        ) continue;
                        ticketsNumber[amount] = number;
                        ticketsAmount[amount] = _viewUserTicetAmount(
                            user,
                            _encodedNumber(number, 3)
                        );
                        ticketsWeight[amount] = _viewUserTicetWeight(
                            user,
                            _encodedNumber(number, 3)
                        );
                        amount++;
                        if (amount >= maxAmount)
                            return (
                                ticketsNumber,
                                ticketsAmount,
                                ticketsWeight,
                                amount
                            );
                    }
                }
            }
        }
        return (ticketsNumber, ticketsAmount, ticketsWeight, amount);
    }

    function viewUserRewardsInfo(
        address user,
        uint256 _startRound,
        uint256 _endRound
    )
        external
        view
        returns (
            uint256[] memory,
            uint256[] memory,
            uint256[] memory
        )
    {
        require(
            _startRound <= _endRound,
            "End lottery smaller than start lottery"
        );
        require(_endRound <= currentLotteryId, "End lottery round not open");

        require(
            lotteries[_endRound].status == Status.Claimable,
            "this round of lottery are not ready for claiming"
        );

        uint256[] memory lotteryIds = new uint256[](
            _endRound - _startRound + 1
        );
        uint256[] memory userRewards = new uint256[](
            _endRound - _startRound + 1
        );
        uint256[] memory userDrawed = new uint256[](
            _endRound - _startRound + 1
        );
        uint256 userStartLotteryId = userCheckPoint[user];
        for (uint256 i = _startRound; i <= _endRound; i++) {
            lotteryIds[i - _startRound] = i;
            if (i < userStartLotteryId) {
                userDrawed[i - _startRound] = 1;
                userRewards[i - _startRound] = usersRewards[user][i];
            } else {
                userDrawed[i - _startRound] = 0;
                userRewards[i - _startRound] = receiveReward(i, user);
            }
        }
        return (lotteryIds, userRewards, userDrawed);
    }
}
