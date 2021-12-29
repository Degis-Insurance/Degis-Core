// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../utils/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IDegisLottery.sol";
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
        uint256 injectedAwards;
        uint256 pendingAwards;
        uint256 finalNumber;
    }
    mapping(uint256 => LotteryInfo) public lotteries;

    // pool
    uint256 public pendingAwardsToNextLottery;

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
        uint256 injectedAmount
    );
    event LotteryNumberDrawn(
        uint256 indexed lotteryId,
        uint256 finalNumber,
        uint256 pendingAwards
    );

    event ReceiveAwards(
        address indexed claimer,
        uint256 amount,
        uint256 indexed lotteryId
    );
    event LotteryClose(uint256 indexed lotteryId);
    event LotteryFundInjection(
        uint256 indexed lotteryId,
        uint256 injectedAmount
    );
    event NewRandomGenerator(address indexed randomGenerator);
    event NewOperatorAndTreasuryAndInjectorAddresses(address operator);
    event AdminTokenRecovery(address token, uint256 amount);

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
    // ************************************ Set Functions ************************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Set operator, treasury, and injector addresses
     * @dev Only callable by the owner
     * @param _operatorAddress address of the operator
     */
    function setOperatorAddresses(address _operatorAddress) external onlyOwner {
        require(_operatorAddress != address(0), "Cannot be zero address");

        operatorAddress = _operatorAddress;

        emit NewOperatorAndTreasuryAndInjectorAddresses(_operatorAddress);
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
            "total rewards of each bracket must less or equal than 10000"
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
            injectedAwards: pendingAwardsToNextLottery,
            pendingAwards: 0,
            finalNumber: 0
        });
        pendingAwardsToNextLottery = 0;

        emit LotteryOpen(
            currentLotteryId,
            lotteries[currentLotteryId].startTime,
            lotteries[currentLotteryId].endTime,
            lotteries[currentLotteryId].injectedAwards
        );
    }

    /**
     * @notice Close a lottery
     * @dev Callable only by the operator
     */
    function closeLottery() external onlyOperator nonReentrant {
        require(
            lotteries[currentLotteryId].status == Status.Open,
            "this lottery is not open currently"
        );

        // Request a random number from the generator
        randomGenerator.getRandomNumber();

        // Update the lottery status to "Close"
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
            "The length of ticket numbers and amounts are different"
        );

        require(
            lotteries[currentLotteryId].status == Status.Open,
            "Sorry, current lottery is not open"
        );

        if (userCheckPoint[_msgSender()] == 0) {
            userCheckPoint[_msgSender()] = currentLotteryId;
        }

        if (userCheckPoint[_msgSender()] < currentLotteryId) {
            receiveAwards(currentLotteryId - 1);
        }

        uint256 currentWeight = getCurrentWeight();

        uint256 totalAmount = 0;

        for (uint256 i = 0; i < _ticketNumbers.length; i++) {
            _buyTicket(
                poolTickets,
                _ticketNumbers[i],
                _ticketAmounts[i],
                currentWeight * _ticketAmounts[i]
            );
            _buyTicket(
                usersTickets[_msgSender()],
                _ticketNumbers[i],
                _ticketAmounts[i],
                currentWeight * _ticketAmounts[i]
            );
            totalAmount += _ticketAmounts[i];
        }

        DEGToken.safeTransferFrom(
            address(msg.sender),
            address(this),
            totalAmount * TICKET_PRICE
        );

        emit TicketsPurchase(msg.sender, currentLotteryId, totalAmount);
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

        if (userCheckPoint[msg.sender] == 0) {
            userCheckPoint[msg.sender] = currentLotteryId;
        }

        if (userCheckPoint[msg.sender] < currentLotteryId) {
            receiveAwards(currentLotteryId - 1);
        }

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _ticketNumbers.length; i++) {
            uint256 hashNumber = _hashNumber(_ticketNumbers[i], 3);

            uint256 ticketAmount = usersTickets[msg.sender].ticketsAmount[
                hashNumber
            ];
            uint256 ticketWight = usersTickets[msg.sender].ticketsWeight[
                hashNumber
            ];
            _redeemTicket(
                poolTickets,
                _ticketNumbers[i],
                ticketAmount,
                ticketWight
            );
            _redeemTicket(
                usersTickets[msg.sender],
                _ticketNumbers[i],
                ticketAmount,
                ticketWight
            );
            totalAmount += ticketAmount;
        }

        require(totalAmount != 0, "No tickets are being bought");

        DEGToken.safeTransfer(address(msg.sender), totalAmount * TICKET_PRICE);

        emit TicketsRedeem(msg.sender, currentLotteryId, totalAmount);
    }

    /**
     * @notice Inject funds
     * @param _amount amount to inject 
     * @dev Callable by owner(incentive) or injector address(insurancePool income)
            First transfer USD and then call this function to record
     */
    function injectFunds(uint256 _amount) external onlyOperator {
        require(
            lotteries[currentLotteryId].status == Status.Open,
            "the lottery round is not open, choose the right round"
        );

        USDToken.safeTransferFrom(_msgSender(), address(this), _amount);

        uint256 USD_Balance = USDToken.balanceOf(address(this));
        lotteries[currentLotteryId].injectedAwards += _amount;
        require(_calculateTotalAwards() <= USD_Balance, "the amount is wrong");

        emit LotteryFundInjection(currentLotteryId, _amount);
    }

    /**
     * @notice Draw the final number, calculate reward in DEG for each group,
     *         and make this lottery claimable (need to wait for the random generator)
     * @dev Callable only by the operator
     */
    function drawLottery() external onlyOperator nonReentrant {
        require(
            lotteries[currentLotteryId].status == Status.Close,
            "this lottery has not closed, you should first close it"
        );
        require(
            currentLotteryId == randomGenerator.latestLotteryId(),
            "the final number has not been drawn"
        );

        // Get the final lucky numbers from randomGenerator
        uint256 finalNumber = randomGenerator.getRandomResult();

        uint256 lastAmount = 0;
        uint256 lastWeight = 0;

        LotteryInfo storage lottery = lotteries[currentLotteryId];

        for (uint256 j = 0; j < 4; j++) {
            uint256 i = 3 - j;

            uint256 hashNumber = _hashNumber(finalNumber, i);

            lottery.stageAmount[i] =
                poolTickets.ticketsAmount[hashNumber] -
                lastAmount;
            lastAmount = poolTickets.ticketsAmount[hashNumber];

            lottery.stageWeight[i] =
                poolTickets.ticketsWeight[hashNumber] -
                lastWeight;
            lastWeight = poolTickets.ticketsWeight[hashNumber];

            if (lottery.stageAmount[i] == 0) lottery.stageReward[i] = 0;
            else
                lottery.stageReward[i] =
                    (lottery.stageProportion[i] * lottery.injectedAwards) /
                    10000;

            lottery.pendingAwards += lotteries[currentLotteryId].stageReward[i];
        }

        pendingAwardsToNextLottery =
            lotteries[currentLotteryId].injectedAwards -
            lotteries[currentLotteryId].pendingAwards;

        // allpending + injectedAwards <=
        require(
            _calculateTotalAwards() <= USDToken.balanceOf(address(this)),
            "USD not balance"
        );

        // Update internal statuses for this lottery round
        lotteries[currentLotteryId].finalNumber = finalNumber;
        lotteries[currentLotteryId].status = Status.Claimable;

        // update allpending

        emit LotteryNumberDrawn(
            currentLotteryId,
            finalNumber, // final result for this round
            lotteries[currentLotteryId].pendingAwards
        );
    }

    /**
     * @notice Receive award from a lottery
     * @param _lotteryId lottery id
     * @param user user address
     */
    function receiveAward(uint256 _lotteryId, address user)
        public
        view
        returns (uint256)
    {
        uint256 award = 0;
        uint256 lastWeight = 0;
        uint256 finalNumber = lotteries[_lotteryId].finalNumber;
        for (uint256 j = 0; j < 4; j++) {
            uint256 i = 3 - j;
            uint256 hashNumber = _hashNumber(finalNumber, i);
            uint256 weight = usersTickets[user].ticketsWeight[hashNumber] -
                lastWeight;
            lastWeight = usersTickets[user].ticketsWeight[hashNumber];
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
    function receiveAwards(uint256 _lotteryId) public notContract {
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
            uint256 award = receiveAward(i, msg.sender);
            awards += award;
            lotteries[i].pendingAwards -= award;

            usersRewards[msg.sender][i] = award;
            usersTotalRewards[msg.sender] += award;
        }
        userCheckPoint[msg.sender] = _lotteryId + 1;

        // allpending -= awards

        // require(awards != 0, "no awards");

        // Transfer the prize to winner
        if (awards != 0) {
            USDToken.safeTransfer(msg.sender, awards);
        }
        emit ReceiveAwards(msg.sender, awards, _lotteryId);
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

    function getCurrentWeight() public view returns (uint256) {
        return ((currentLotteryId + 24) * 1000000) / (currentLotteryId + 12);
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Internal Functions ********************************* //
    // ---------------------------------------------------------------------------------------- //

    function _buyTicket(
        Tickets storage tickets,
        uint256 ticketNumber,
        uint256 ticketAmount,
        uint256 ticketWeight
    ) internal {
        for (uint256 i = 0; i < 4; i++) {
            uint256 hashNumber = _hashNumber(ticketNumber, i);
            tickets.ticketsWeight[hashNumber] += ticketWeight;
            tickets.ticketsAmount[hashNumber] += ticketAmount;
        }
    }

    function _redeemTicket(
        Tickets storage tickets,
        uint256 ticketNumber,
        uint256 ticketAmount,
        uint256 ticketWeight
    ) internal {
        for (uint256 i = 0; i < 4; i++) {
            uint256 hashNumber = _hashNumber(ticketNumber, i);
            tickets.ticketsWeight[hashNumber] -= ticketWeight;
            tickets.ticketsAmount[hashNumber] -= ticketAmount;
        }
    }

    function _hashNumber(uint256 number, uint256 position)
        internal
        pure
        returns (uint256)
    {
        return (number % (10**(position + 1))) + position * 10000;
    }

    function _calculateTotalAwards() internal view returns (uint256) {
        uint256 amount = 0;

        for (uint256 i = 0; i < currentLotteryId; i++) {
            amount += lotteries[i].pendingAwards;
        }

        if (lotteries[currentLotteryId].status == Status.Claimable) {
            amount +=
                lotteries[currentLotteryId].pendingAwards +
                pendingAwardsToNextLottery;
        } else {
            amount += lotteries[currentLotteryId].injectedAwards;
        }
        return amount;
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

    /**
     * @notice View current lottery id
     */
    function viewCurrentLotteryId() external view returns (uint256) {
        return currentLotteryId;
    }

    /**
     * @notice View user tickets info
     */
    function viewUserTicketsInfo(
        address user,
        uint256 st,
        uint256 nd,
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
        uint256[] memory ticketsNumber = new uint256[](nd - st + 1);
        uint256[] memory ticketsAmount = new uint256[](nd - st + 1);
        uint256[] memory ticketsWeight = new uint256[](nd - st + 1);
        for (uint256 i = st; i <= nd; i++) {
            uint256 hashNumber = _hashNumber(i, position);
            ticketsNumber[i - st] = i;
            ticketsAmount[i - st] = usersTickets[user].ticketsAmount[
                hashNumber
            ];
            ticketsWeight[i - st] = usersTickets[user].ticketsWeight[
                hashNumber
            ];
        }
        return (ticketsNumber, ticketsAmount, ticketsWeight);
    }

    function _viewUserTicetAmount(address user, uint256 hashNumber)
        internal
        view
        returns (uint256)
    {
        return usersTickets[user].ticketsAmount[hashNumber];
    }

    function _viewUserTicetWeight(address user, uint256 hashNumber)
        internal
        view
        returns (uint256)
    {
        return usersTickets[user].ticketsWeight[hashNumber];
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
            if (_viewUserTicetAmount(user, _hashNumber(number, 0)) == 0)
                continue;
            for (i1 = 0; i1 <= 9; i1++) {
                number = i0 + i1 * 10;
                if (_viewUserTicetAmount(user, _hashNumber(number, 1)) == 0)
                    continue;
                for (i2 = 0; i2 <= 9; i2++) {
                    number = i0 + i1 * 10 + i2 * 100;
                    if (_viewUserTicetAmount(user, _hashNumber(number, 2)) == 0)
                        continue;
                    for (i3 = 0; i3 <= 9; i3++) {
                        number = i0 + i1 * 10 + i2 * 100 + i3 * 1000;
                        if (
                            _viewUserTicetAmount(
                                user,
                                _hashNumber(number, 3)
                            ) == 0
                        ) continue;
                        ticketsNumber[amount] = number;
                        ticketsAmount[amount] = _viewUserTicetAmount(
                            user,
                            _hashNumber(number, 3)
                        );
                        ticketsWeight[amount] = _viewUserTicetWeight(
                            user,
                            _hashNumber(number, 3)
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
        uint256 st,
        uint256 nd
    )
        external
        view
        returns (
            uint256[] memory,
            uint256[] memory,
            uint256[] memory
        )
    {
        require(st <= nd, "end lottery smaller than start lottery");
        require(nd <= currentLotteryId, "end lottery not open");
        require(
            lotteries[nd].status == Status.Claimable,
            "this round of lottery are not ready for claiming"
        );

        uint256[] memory lotteryIds = new uint256[](nd - st + 1);
        uint256[] memory userRewards = new uint256[](nd - st + 1);
        uint256[] memory userDrawed = new uint256[](nd - st + 1);
        uint256 userStartLotteryId = userCheckPoint[user];
        for (uint256 i = st; i <= nd; i++) {
            lotteryIds[i - st] = i;
            if (i < userStartLotteryId) {
                userDrawed[i - st] = 1;
                userRewards[i - st] = usersRewards[user][i];
            } else {
                userDrawed[i - st] = 0;
                userRewards[i - st] = receiveAward(i, user);
            }
        }
        return (lotteryIds, userRewards, userDrawed);
    }

    /**
     * @notice View pool tickets info
     */
    function viewPoolTicketsInfo(
        uint256 st,
        uint256 nd,
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
        uint256[] memory ticketsNumber = new uint256[](nd - st + 1);
        uint256[] memory ticketsAmount = new uint256[](nd - st + 1);
        uint256[] memory ticketsWeight = new uint256[](nd - st + 1);
        for (uint256 i = st; i <= nd; i++) {
            uint256 hashNumber = _hashNumber(i, position);
            ticketsNumber[i - st] = i;
            ticketsAmount[i - st] = poolTickets.ticketsAmount[hashNumber];
            ticketsWeight[i - st] = poolTickets.ticketsWeight[hashNumber];
        }
        return (ticketsNumber, ticketsAmount, ticketsWeight);
    }

    /**
     * @notice View lottery information
     * @param _lotteryId: lottery id
     */
    function viewLottery(uint256 _lotteryId)
        external
        view
        returns (LotteryInfo memory)
    {
        return lotteries[_lotteryId];
    }
}
