// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

import "../utils/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IRandomNumberGenerator.sol";

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

    uint256 public rewardsToNextLottery;

    uint256 public allPendingRewards;

    uint256 public rewardBalance;

    uint256 public currentLotteryId; // Total Rounds

    mapping(address => uint256) public checkPoint;
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

    event LotteryClose(uint256 indexed lotteryId, uint256 timestamp);

    event LotteryFundInjection(
        uint256 indexed lotteryId,
        uint256 injectedAmount
    );
    event RandomNumberGeneratorChanged(
        address oldGenerator,
        address newGenerator
    );
    event OperatorAddressChanged(address oldOperator, address newOperator);
    event AdminTokenRecovery(address indexed token, uint256 amount);

    event UpdateBalance(
        uint256 lotteryId,
        uint256 oldBalance,
        uint256 newBalance
    );

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
    ) Ownable(msg.sender) {
        DEGToken = IERC20(_DEGTokenAddress);
        USDToken = IERC20(_USDTokenAddress);
        randomGenerator = IRandomNumberGenerator(_randomGeneratorAddress);
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************** Modifiers *************************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Not contract address
     */
    modifier notContract() {
        require(!_isContract(msg.sender), "Contract not allowed");
        require(msg.sender == tx.origin, "Proxy contract not allowed");
        _;
    }

    /**
     * @notice Only the operator or owner
     */
    modifier onlyOperator() {
        require(
            msg.sender == operatorAddress || msg.sender == owner(),
            "Not operator or owner"
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
        uint256 length = _stopIndex - _startIndex + 1;

        uint256[] memory ticketsNumber = new uint256[](length);
        uint256[] memory ticketsAmount = new uint256[](length);
        uint256[] memory ticketsWeight = new uint256[](length);

        for (uint256 i = _startIndex; i <= _stopIndex; i++) {
            uint256 encodedNumber = _encodeNumber(i, _position);

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
            uint256 encodedNumber = _encodeNumber(i, position);
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
     * @notice Set operator address
     * @dev Only callable by the owner
     * @param _operatorAddress address of the operator
     */
    function setOperatorAddress(address _operatorAddress) external onlyOwner {
        require(_operatorAddress != address(0), "Cannot be zero address");

        emit OperatorAddressChanged(operatorAddress, _operatorAddress);
        operatorAddress = _operatorAddress;
    }

    /**
     * @notice Set Random Number Generator contract address
     * @dev Only callable by the owner
     * @param _randomNumberGenerator Address of the Random Number Generator contract
     */
    function setRandomNumberGenerator(address _randomNumberGenerator)
        external
        onlyOwner
    {
        require(
            _randomNumberGenerator != address(0),
            "Can not be zero address"
        );
        emit RandomNumberGeneratorChanged(
            address(randomGenerator),
            _randomNumberGenerator
        );

        randomGenerator = IRandomNumberGenerator(_randomNumberGenerator);
    }

    /**
     * @notice Change the end time of current round (only if it was set a wrong number)
     * @dev Normally this function is not needed
     * @param _endTime New end time
     */
    function setEndTime(uint256 _endTime) external onlyOwner {
        uint256 currentId = currentLotteryId;
        require(
            lotteries[currentId].status == Status.Open,
            "Only change endtime when Lottery open"
        );

        lotteries[currentId].endTime = _endTime;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Start the lottery
     * @dev Callable only by operator
     * @param _endTime EndTime of the lottery (UNIX timestamp in s)
     * @param _stageProportion Breakdown of rewards per bracket
     * @dev Stage proportion must sum to 10,000(100 <=> 1)
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

        updateBalance();

        // gas saving
        uint256 id = ++currentLotteryId;

        // Do not init those have default values at first
        LotteryInfo storage newLottery = lotteries[id];
        newLottery.status = Status.Open;
        newLottery.startTime = block.timestamp;
        newLottery.endTime = _endTime;
        newLottery.stageProportion = _stageProportion;
        newLottery.totalRewards = rewardsToNextLottery;

        // First emit the event
        emit LotteryOpen(id, block.timestamp, _endTime, rewardsToNextLottery);

        // Clear rewards to next lottery
        rewardsToNextLottery = 0;
    }

    /**
     * @notice Close a lottery
     * @dev Callable by any address and need to meet the endtime condition
     * @dev Normally it's automatically called by our contract
     */
    function closeLottery() external nonReentrant {
        updateBalance();

        // gas saving
        uint256 currentId = currentLotteryId;

        require(
            lotteries[currentId].status == Status.Open,
            "Current lottery is not open"
        );

        require(
            block.timestamp >= lotteries[currentId].endTime,
            "Not time to close lottery"
        );

        lotteries[currentId].endTime = block.timestamp;

        // Request a random number from the generator
        // With VRF, the response may need some time to be generated
        randomGenerator.getRandomNumber();

        // Update the lottery status
        lotteries[currentId].status = Status.Close;

        emit LotteryClose(currentId, block.timestamp);
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

        // gas saving
        uint256 currentId = currentLotteryId;

        require(
            lotteries[currentId].status == Status.Open,
            "Current lottery is not open"
        );

        if (checkPoint[msg.sender] == 0) {
            checkPoint[msg.sender] = currentId;
        }

        if (checkPoint[msg.sender] < currentId) {
            receiveRewards(currentId - 1);
        }

        // Get the weight of current round (round is a global content)
        uint256 roundWeight = getCurrentRoundWeight();

        // Total amount of tickets will be bought
        uint256 totalAmount;

        for (uint256 i = 0; i < _ticketNumbers.length; i++) {
            _buyTicket(
                poolTickets,
                _ticketNumbers[i],
                _ticketAmounts[i],
                roundWeight * _ticketAmounts[i]
            );
            _buyTicket(
                usersTickets[msg.sender],
                _ticketNumbers[i],
                _ticketAmounts[i],
                roundWeight * _ticketAmounts[i]
            );
            totalAmount += _ticketAmounts[i];
        }

        // Transfer degis
        DEGToken.safeTransferFrom(
            msg.sender,
            address(this),
            totalAmount * TICKET_PRICE
        );

        emit TicketsPurchase(msg.sender, currentId, totalAmount);
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

        uint256 currentId = currentLotteryId;

        require(
            lotteries[currentId].status == Status.Open,
            "Sorry, current lottery is not open"
        );

        if (checkPoint[msg.sender] < currentId) {
            receiveRewards(currentId - 1);
        }

        uint256 totalAmount;
        for (uint256 i; i < _ticketNumbers.length; i++) {
            uint256 encodedNumber = _encodeNumber(_ticketNumbers[i], 3);

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
                usersTickets[msg.sender],
                _ticketNumbers[i],
                ticketAmount,
                ticketWeight
            );
            totalAmount += ticketAmount;
        }

        require(totalAmount != 0, "No tickets are being redeemed");

        DEGToken.safeTransfer(msg.sender, totalAmount * TICKET_PRICE);

        emit TicketsRedeem(msg.sender, currentId, totalAmount);
    }

    function updateBalance() public {
        uint256 curBalance = USDToken.balanceOf(address(this));
        uint256 preBalance = rewardBalance;

        uint256 currentId = currentLotteryId;

        Status currentStatus = lotteries[currentId].status;

        if (currentStatus == Status.Open) {
            lotteries[currentId].totalRewards =
                lotteries[currentId].totalRewards +
                curBalance -
                preBalance;
        } else {
            rewardsToNextLottery =
                rewardsToNextLottery +
                curBalance -
                preBalance;
        }

        rewardBalance = curBalance;

        emit UpdateBalance(currentId, preBalance, curBalance);
    }

    /**
     * @notice Draw the final number, calculate reward in DEG for each group,
     *         and make this lottery claimable (need to wait for the random generator)
     * @dev Callable by any address
     */
    function drawLottery() external nonReentrant {
        uint256 currentId = currentLotteryId;
        require(
            lotteries[currentId].status == Status.Close,
            "this lottery has not closed, you should first close it"
        );
        require(
            currentId == randomGenerator.latestLotteryId(),
            "the final number has not been drawn"
        );

        updateBalance();

        // Get the final lucky numbers from randomGenerator
        uint256 finalNumber = randomGenerator.randomResult();

        uint256 lastAmount;
        uint256 lastWeight;

        LotteryInfo storage currentLottery = lotteries[currentId];

        uint256 tempPendingRewards;

        for (uint256 j = 0; j < 4; j++) {
            uint256 i = 3 - j;

            uint256 encodedNumber = _encodeNumber(finalNumber, i);

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

        rewardsToNextLottery =
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
    function pendingReward(uint256 _lotteryId, address user)
        public
        view
        returns (uint256 reward)
    {
        uint256 lastWeight;
        uint256 finalNumber = lotteries[_lotteryId].finalNumber;

        for (uint256 j; j < 4; j++) {
            uint256 i = 3 - j;

            uint256 encodedNumber = _encodeNumber(finalNumber, i);

            uint256 weight = usersTickets[user].ticketsWeight[encodedNumber] -
                lastWeight;

            lastWeight += weight;

            if (lotteries[_lotteryId].stageWeight[i] != 0) {
                reward +=
                    (lotteries[_lotteryId].stageReward[i] * weight) /
                    lotteries[_lotteryId].stageWeight[i];
            }
        }
    }

    /**
     * @notice Receive all awards from lottery before lottery id
     * @param _lotteryId lottery id
     * @dev Callable by users only, not contract!
     */
    function receiveRewards(uint256 _lotteryId) public notContract {
        require(
            lotteries[_lotteryId].status == Status.Claimable,
            "This round not claimable"
        );

        require(
            checkPoint[msg.sender] <= _lotteryId,
            "All rewards have been received"
        );

        uint256 reward;

        for (
            uint256 round = checkPoint[msg.sender];
            round <= _lotteryId;
            round++
        ) {
            uint256 roundReward = pendingReward(round, msg.sender);
            reward += roundReward;

            lotteries[round].pendingRewards -= roundReward;

            usersRewards[msg.sender][round] = roundReward;
            usersTotalRewards[msg.sender] += roundReward;
        }
        checkPoint[msg.sender] = _lotteryId + 1;

        allPendingRewards -= reward;

        // Transfer the prize to winner
        if (reward != 0) {
            USDToken.safeTransfer(msg.sender, reward);
        }
        emit ReceiveRewards(msg.sender, reward, _lotteryId);
    }

    /**
     * @notice Recover wrong tokens sent to the contract
     * @dev    Only callable by the owner
     * @dev    All tokens except DEG and USD are wrong tokens
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
        for (uint256 i; i < 4; i++) {
            uint256 encodedNumber = _encodeNumber(_ticketNumber, i);
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
            uint256 encodedNumber = _encodeNumber(_ticketNumber, i);
            tickets.ticketsWeight[encodedNumber] -= _ticketWeight;
            tickets.ticketsAmount[encodedNumber] -= _ticketAmount;
        }
    }

    /**
     * @notice Get the encoded number form
     * @param _number The original number
     * @param _position The number's position/level (0, 1, 2, 3)
     */
    function _encodeNumber(uint256 _number, uint256 _position)
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

    function _viewUserTicketAmount(address user, uint256 encodedNumber)
        internal
        view
        returns (uint256)
    {
        return usersTickets[user].ticketsAmount[encodedNumber];
    }

    function _viewUserTicketWeight(address user, uint256 encodedNumber)
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

        uint256 amount;
        uint256 number;
        uint256 i0;
        uint256 i1;
        uint256 i2;
        uint256 i3;

        for (i0; i0 <= 9; i0++) {
            number = i0;
            if (_viewUserTicketAmount(user, _encodeNumber(number, 0)) == 0)
                continue;
            for (i1 = 0; i1 <= 9; i1++) {
                number = i0 + i1 * 10;
                if (_viewUserTicketAmount(user, _encodeNumber(number, 1)) == 0)
                    continue;
                for (i2 = 0; i2 <= 9; i2++) {
                    number = i0 + i1 * 10 + i2 * 100;
                    if (
                        _viewUserTicketAmount(user, _encodeNumber(number, 2)) ==
                        0
                    ) continue;
                    for (i3 = 0; i3 <= 9; i3++) {
                        number = i0 + i1 * 10 + i2 * 100 + i3 * 1000;
                        if (
                            _viewUserTicketAmount(
                                user,
                                _encodeNumber(number, 3)
                            ) == 0
                        ) continue;
                        ticketsNumber[amount] = number;
                        ticketsAmount[amount] = _viewUserTicketAmount(
                            user,
                            _encodeNumber(number, 3)
                        );
                        ticketsWeight[amount] = _viewUserTicketWeight(
                            user,
                            _encodeNumber(number, 3)
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
        uint256 userStartLotteryId = checkPoint[user];
        for (uint256 i = _startRound; i <= _endRound; i++) {
            lotteryIds[i - _startRound] = i;
            if (i < userStartLotteryId) {
                userDrawed[i - _startRound] = 1;
                userRewards[i - _startRound] = usersRewards[user][i];
            } else {
                userDrawed[i - _startRound] = 0;
                userRewards[i - _startRound] = pendingReward(i, user);
            }
        }
        return (lotteryIds, userRewards, userDrawed);
    }
}
