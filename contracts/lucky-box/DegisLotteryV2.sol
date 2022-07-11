// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IRandomNumberGenerator.sol";
import "./MathLib.sol";

import "hardhat/console.sol";

/**
 * @title DegisLotteryV2
 *
 * @dev This lottery uses DEG as tickets and DEG as rewards also
 *      Users can pay 10 DEG to buy one ticket and choose four digits for each ticket
 *      After the lottery was closed, it will draw a final random number through Chainlink VRF
 *      Users get rewards according to the how many numbers they matched with the final number
 *
 *      Reward distribution:
 *      80% of each round prize pool will be distributed to the winners (breakdowns for different levels)
 *      20% of each round prize pool will be rolled to next round (except for treasury fee)
 *
 */

contract DegisLotteryV2 is ReentrancyGuardUpgradeable, OwnableUpgradeable {
    using MathLib for uint256;
    using MathLib for int128;

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constants **************************************** //
    // ---------------------------------------------------------------------------------------- //

    // Treasury fee
    uint256 public constant MAX_TREASURY_FEE = 2000; // 20%

    // Ticket numbers
    uint32 public constant MIN_TICKET_NUMBER = 10000;
    uint32 public constant MAX_TICKET_NUMBER = 19999;

    // Default ticket price
    uint256 public constant DEFAULT_PRICE = 10 ether;

    // 98% for each extra ticket
    uint256 public constant DISCOUNT_DIVISOR = 98;

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Variables **************************************** //
    // ---------------------------------------------------------------------------------------- //

    IERC20 public DegisToken;
    IRandomNumberGenerator public randomGenerator;

    address public treasury;

    uint256 public currentLotteryId; // Total Rounds

    uint256 public currentTicketId; // Total Tickets

    uint256 public maxNumberTicketsEachTime;

    uint256 public pendingInjectionNextLottery;

    enum Status {
        Pending,
        Open,
        Close,
        Claimable
    }

    struct Lottery {
        // Slot 1
        Status status; // uint8
        uint32 treasuryFee; // 500: 5% // 200: 2% // 50: 0.5%
        uint32 startTime;
        uint32 endTime;
        uint32 finalNumber;
        // Slot 2,3...
        uint256 ticketPrice; // 10
        uint256[4] rewardsBreakdown; // 0: 1 matching number // 3: 4 matching numbers
        uint256[4] rewardPerTicketInBracket;
        uint256[4] countWinnersPerBracket;
        uint256 firstTicketId;
        uint256 firstTicketIdNextRound;
        uint256 amountCollected; // Total prize pool
        uint256 pendingRewards; // Rewards that are not yet claimed
    }
    // lotteryId => Lottery Info
    mapping(uint256 => Lottery) public lotteries;

    struct Ticket {
        uint32 number;
        address owner;
    }
    // Ticket Id => Ticket Info
    mapping(uint256 => Ticket) public tickets;

    // lotteryId => (Lucky Number => Total Amount of this number)
    // e.g. In lottery round 3, 10 Tickets are sold with "11234": 3 => (11234 => 10)
    mapping(uint256 => mapping(uint32 => uint256))
        public _numberTicketsPerLotteryId;

    // Keep track of user ticket ids for a given lotteryId
    // User Address => Lottery Round => Tickets
    mapping(address => mapping(uint256 => uint256[])) public _userTicketIds;

    mapping(uint32 => uint32) public _bracketCalculator;

    // User address => lotteryId => Amount of tickets has claimed
    mapping(address => mapping(uint256 => uint256)) public userClaimed;

    // Default config parameters
    // With global parameters, lottery operations can be set as auto tasks
    uint256 public treasuryFee;
    uint256[4] public rewardsBreakdown;
    uint256 public roundLength;

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Events ***************************************** //
    // ---------------------------------------------------------------------------------------- //

    event MaxNumberTicketsEachTimeChanged(
        uint256 oldMaxNumber,
        uint256 newMaxNumber
    );
    event RoundLengthChanged(uint256 oldRoundLength, uint256 newRoundLength);
    event TreasuryChanged(address oldTreasury, address newTreasury);
    event AdminTokenRecovery(address token, uint256 amount);
    event LotteryClose(uint256 indexed lotteryId);
    event LotteryInjection(uint256 indexed lotteryId, uint256 injectedAmount);
    event LotteryOpen(
        uint256 indexed lotteryId,
        uint256 startTime,
        uint256 roundLength,
        uint256 priceTicketInDegis,
        uint256[4] rewardsBreakdown,
        uint256 injectedAmount
    );
    event LotteryNumberDrawn(
        uint256 indexed lotteryId,
        uint256 finalNumber,
        uint256 countWinningTickets
    );

    event NewRandomGenerator(address indexed randomGenerator);
    event TicketsPurchased(
        address indexed buyer,
        uint256 indexed lotteryId,
        uint256 number,
        uint256 totalPrice
    );
    event TicketsClaim(
        address indexed claimer,
        uint256 amount,
        uint256 indexed lotteryId
    );

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Initialize function
     *
     * @dev RandomNumberGenerator must be deployed prior to this contract
     *
     * @param _degis           Address of DEG
     * @param _randomGenerator Address of the RandomGenerator contract used to work with ChainLink VRF
     */
    function initialize(address _degis, address _randomGenerator)
        public
        initializer
    {
        __Ownable_init();
        __ReentrancyGuard_init_unchained();

        DegisToken = IERC20(_degis);
        randomGenerator = IRandomNumberGenerator(_randomGenerator);

        // Set default ticket amount each time
        maxNumberTicketsEachTime = 10;

        // Set default calculator
        _bracketCalculator[0] = 1;
        _bracketCalculator[1] = 11;
        _bracketCalculator[2] = 111;
        _bracketCalculator[3] = 1111;

        // Ticket id start from 1
        currentTicketId = 1;

        // Set default rewards breakdown
        rewardsBreakdown[0] = 1000;
        rewardsBreakdown[1] = 2000;
        rewardsBreakdown[2] = 3000;
        rewardsBreakdown[3] = 4000;

        // Default treasury fee
        treasuryFee = 500;

        // Default round length
        roundLength = 5 days;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************** Modifiers *************************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Only EOA accounts to participate
     */
    modifier notContract() {
        require(!_isContract(msg.sender), "Contract not allowed");
        require(msg.sender == tx.origin, "Proxy contract not allowed");
        _;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ View Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Get the reward per ticket in 4 brackets
     *
     * @param _wallet address to check owned tickets
     *
     * @return _lotteryId lottery id to verify ownership
     */
    function viewWalletTicketIds(address _wallet, uint256 _lotteryId)
        external
        view
        returns (uint256[] memory)
    {
        uint256[] memory result = _userTicketIds[_wallet][_lotteryId];
        return result;
    }

    /**
     * @notice View lottery information
     *
     * @param _startId Start lottery id
     * @param _endId End lottery id
     *
     * @return Array of lottery information
     */
    function viewAllLottery(uint256 _startId, uint256 _endId)
        external
        view
        returns (Lottery[] memory)
    {
        Lottery[] memory allLottery = new Lottery[](_endId - _startId + 1);
        for (uint256 i = _startId; i <= _endId; i++) {
            allLottery[i - 1] = lotteries[i];
        }
        return allLottery;
    }

    /**
     * @notice View ticker statuses and numbers for an array of ticket ids
     * @param _ticketIds: array of _ticketId
     */
    function viewNumbersPerTicketId(uint256[] calldata _ticketIds)
        external
        view
        returns (
            /// ticketIdsNumbersAndStatuses
            uint32[] memory
        )
    {
        uint256 length = _ticketIds.length;
        uint32[] memory ticketNumbers = new uint32[](length);

        for (uint256 i = 0; i < length; i++) {
            ticketNumbers[i] = tickets[_ticketIds[i]].number;
        }

        return (ticketNumbers);
    }

    /**
     * @notice View rewards for a given ticket in a given lottery round
     *
     * @dev This function will help to find the highest prize bracket
     *      But this computation is encouraged to be done off-chain
     *      Better to get bracket first and then call "_calculateRewardsForTicketId()"
     *
     * @param _lotteryId Lottery round
     * @param _ticketId  Ticket id
     *
     * @return reward Ticket reward
     */
    function viewRewardsForTicketId(uint256 _lotteryId, uint256 _ticketId)
        public
        view
        returns (uint256)
    {
        // Check lottery is in claimable status
        if (lotteries[_lotteryId].status != Status.Claimable) {
            return 0;
        }

        // Check ticketId is within range
        if (
            lotteries[_lotteryId].firstTicketIdNextRound < _ticketId ||
            lotteries[_lotteryId].firstTicketId > _ticketId
        ) {
            return 0;
        }

        // Only calculate prize for the highest bracket
        uint32 highestBracket = _getBracket(_lotteryId, _ticketId);

        return
            _calculateRewardsForTicketId(_lotteryId, _ticketId, highestBracket);
    }

    /**
     * @notice View user rewards between rounds
     *
     * @param _user       User address
     * @param _startRound Start lottery id
     * @param _endRound   End lottery id
     */
    function viewUserRewards(
        address _user,
        uint256 _startRound,
        uint256 _endRound
    ) external view returns (uint256[] memory userRewards) {
        userRewards = new uint256[](_endRound - _startRound + 1);

        for (uint256 i = _startRound; i <= _endRound; ) {
            uint256 ticketAmount = _userTicketIds[_user][i].length;

            console.log("ticket amount: ", ticketAmount);
            console.log("gas used: ", gasleft());

            if (ticketAmount > 0) {
                uint256[] memory ticketIds = _userTicketIds[_user][i];

                for (uint256 j; j < ticketAmount; ) {
                    uint256 reward = viewRewardsForTicketId(i, ticketIds[j]);
                    userRewards[i - 1] += reward;

                    console.log("reward:", reward);

                    unchecked {
                        ++j;
                    }
                }
            }

            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice View rewards for each ticket in a given lottery round, given bracket
     */
    function viewRewardPerTicketInBracket(uint256 _lotteryId)
        external
        view
        returns (uint256[4] memory)
    {
        return lotteries[_lotteryId].rewardPerTicketInBracket;
    }

    /**
     * @notice View winner ticket amount for a given lottery round, for each bracket
     */
    function viewWinnerAmount(uint256 _lotteryId)
        external
        view
        returns (uint256[4] memory)
    {
        return lotteries[_lotteryId].countWinnersPerBracket;
    }

    /**
     * @notice View rewards breakdown for a given lottery round
     */
    function viewRewardsBreakdown(uint256 _lotteryId)
        external
        view
        returns (uint256[4] memory)
    {
        return lotteries[_lotteryId].rewardsBreakdown;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Set Functions ************************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Set max number can buy/claim each time
     *
     * @param _maxNumber Max number each time
     */
    function setMaxNumberTicketsEachTime(uint256 _maxNumber)
        external
        onlyOwner
    {
        emit MaxNumberTicketsEachTimeChanged(
            maxNumberTicketsEachTime,
            _maxNumber
        );
        maxNumberTicketsEachTime = _maxNumber;
    }

    /**
     * @notice Set treasury wallet address
     *
     * @param _treasury Treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        emit TreasuryChanged(treasury, _treasury);
        treasury = _treasury;
    }

    /**
     * @notice Set round length
     *
     * @param _length New round length
     */
    function setRoundLength(uint256 _length) external onlyOwner {
        require(_length > 0, "Zero round length");
        emit RoundLengthChanged(roundLength, _length);
        roundLength = _length;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Buy tickets for the current lottery round
     *
     * @dev Need to transfer the 4-digit number to a 5-digit number to be used here (+10000)
     *      Can not be called by a smart contract
     *      Can only purchase in the current round
     *      E.g. You are selecting the number of 1-2-3-4 (lowest to highest)
     *           You will need to pass a number "14321"
     *
     * @param _ticketNumbers Array of ticket numbers between 10,000 and 19,999
     */
    function buyTickets(uint32[] calldata _ticketNumbers)
        external
        notContract
        nonReentrant
    {
        uint256 amountToBuy = _ticketNumbers.length;
        require(amountToBuy > 0, "No tickets are being bought");
        require(amountToBuy <= maxNumberTicketsEachTime, "Too many tickets");

        // Gas savings
        Lottery storage lottery = lotteries[currentLotteryId];
        uint256 currentRound = currentLotteryId;
        require(lottery.status == Status.Open, "Round not open");

        // Calculate the number of DEG to pay
        uint256 degToPay = _calculateTotalPrice(
            lottery.ticketPrice,
            amountToBuy
        );

        // Transfer degis tokens to this contract
        DegisToken.transferFrom(msg.sender, address(this), degToPay);

        // Increase prize pool amount
        lotteries[currentRound].amountCollected += degToPay;

        // Record the tickets bought
        for (uint256 i; i < amountToBuy; ) {
            // uint32 currentTicketNumber = _reverseTicketNumber(
            //     _ticketNumbers[i]
            // );

            uint32 currentTicketNumber = _ticketNumbers[i];

            require(
                (currentTicketNumber >= MIN_TICKET_NUMBER) &&
                    (currentTicketNumber <= MAX_TICKET_NUMBER),
                "Ticket number is outside range"
            );

            // Used when drawing the prize
            ++_numberTicketsPerLotteryId[currentRound][
                1 + (currentTicketNumber % 10)
            ];
            ++_numberTicketsPerLotteryId[currentRound][
                11 + (currentTicketNumber % 100)
            ];
            ++_numberTicketsPerLotteryId[currentRound][
                111 + (currentTicketNumber % 1000)
            ];
            ++_numberTicketsPerLotteryId[currentRound][
                1111 + (currentTicketNumber % 10000)
            ];

            // Gas savings
            uint256 ticketId = currentTicketId;

            // Store this ticket number to the user's record
            _userTicketIds[msg.sender][currentRound].push(ticketId);

            // Store this ticket number to global ticket state
            Ticket storage newTicket = tickets[ticketId];
            newTicket.number = currentTicketNumber;
            newTicket.owner = msg.sender;

            // Increase total lottery ticket number
            unchecked {
                ++currentTicketId;
                ++i;
            }
        }

        emit TicketsPurchased(msg.sender, currentRound, amountToBuy, degToPay);
    }

    /**
     * @notice Claim winning tickets
     *
     * @dev Callable by users only, not contract
     *
     * @param _lotteryId Lottery id
     * @param _ticketIds Array of ticket ids
     * @param _brackets  Bracket / prize level of each ticket
     */
    function claimTickets(
        uint256 _lotteryId,
        uint256[] calldata _ticketIds,
        uint32[] calldata _brackets
    ) external notContract nonReentrant {
        require(
            lotteries[_lotteryId].status == Status.Claimable,
            "Round not claimable"
        );

        uint256 ticketAmount = _ticketIds.length;
        require(ticketAmount == _brackets.length, "Not same length");
        require(ticketAmount > 0, "No tickets");
        require(
            ticketAmount <= maxNumberTicketsEachTime,
            "Too many tickets to claim"
        );

        uint256 rewardToTransfer;

        Lottery storage lottery = lotteries[_lotteryId];

        for (uint256 i; i < ticketAmount; ) {
            uint256 thisTicketId = _ticketIds[i];

            // Check the ticket id is inside the range
            require(
                thisTicketId >= lottery.firstTicketId,
                "Ticket id too small"
            );
            require(
                thisTicketId < lottery.firstTicketIdNextRound,
                "Ticket id too large"
            );

            // Check the ticket is owned by the user and reset this ticket
            // If the owner is zero address, then it has been claimed
            require(
                msg.sender == tickets[thisTicketId].owner,
                "Not the ticket owner or already claimed"
            );
            tickets[thisTicketId].owner = address(0);

            // Can not pass tickets with no prize
            uint256 rewardForTicketId = _calculateRewardsForTicketId(
                _lotteryId,
                thisTicketId,
                _brackets[i]
            );
            // require(rewardForTicketId > 0, "No prize");

            // If not claiming the highest prize, check if the user has a higher prize
            if (_brackets[i] < 3) {
                require(
                    _calculateRewardsForTicketId(
                        _lotteryId,
                        thisTicketId,
                        _brackets[i] + 1
                    ) == 0,
                    "Only highest prize"
                );
            }

            // Increase the reward to transfer
            rewardToTransfer += rewardForTicketId;

            unchecked {
                ++i;
            }
        }

        // Record the amount has claimed in this round
        userClaimed[msg.sender][_lotteryId] += ticketAmount;

        // Transfer the prize to the user
        if (rewardToTransfer > 0) {
            lotteries[_lotteryId].pendingRewards -= rewardToTransfer;

            DegisToken.transfer(msg.sender, rewardToTransfer);
        }

        emit TicketsClaim(msg.sender, rewardToTransfer, _lotteryId);
    }

    /**
     * @notice Claim all winning tickets for a lottery round
     *
     * @dev Callable by users only, not contract
     *      Gas cost may be oversized, recommended to get brackets offchain first
     *      Get brackets offchain and call function "claimTickets"
     *
     * @param _lotteryId Lottery id
     */
    function claimAllTickets(uint256 _lotteryId)
        external
        notContract
        nonReentrant
    {
        require(
            lotteries[_lotteryId].status == Status.Claimable,
            "Round not claimable"
        );

        uint256 rewardToTransfer;

        // Gas savings
        uint256 ticketAmount = _userTicketIds[msg.sender][_lotteryId].length;

        for (uint256 i; i < ticketAmount; ) {
            uint256 thisTicketId = _userTicketIds[msg.sender][_lotteryId][i];

            require(
                msg.sender == tickets[thisTicketId].owner,
                "Not the ticket owner"
            );
            tickets[thisTicketId].owner = address(0);

            uint32 highestBracket = _getBracket(_lotteryId, thisTicketId);
            if (highestBracket < 4) {
                uint256 rewardForTicketId = _calculateRewardsForTicketId(
                    _lotteryId,
                    thisTicketId,
                    highestBracket
                );
                rewardToTransfer += rewardForTicketId;
            }

            unchecked {
                ++i;
            }
        }

        if (rewardToTransfer > 0) {
            // Transfer the prize to winner
            DegisToken.transfer(msg.sender, rewardToTransfer);

            lotteries[_lotteryId].pendingRewards -= rewardToTransfer;
        }
        // Record the amount has claimed in this round
        userClaimed[msg.sender][_lotteryId] = ticketAmount;

        emit TicketsClaim(msg.sender, rewardToTransfer, _lotteryId);
    }

    /**
     * @notice Start a new lottery round
     */
    function startLottery() external {
        require(
            (currentLotteryId == 0) ||
                (lotteries[currentLotteryId].status == Status.Claimable),
            "Wrong status"
        );

        // Gas savings
        uint256 currentId = ++currentLotteryId;

        Lottery storage newLottery = lotteries[currentId];

        newLottery.status = Status.Open;
        newLottery.startTime = uint32(block.timestamp);
        newLottery.endTime = uint32(block.timestamp + roundLength);
        newLottery.ticketPrice = DEFAULT_PRICE;
        newLottery.rewardsBreakdown = rewardsBreakdown;
        newLottery.treasuryFee = uint32(treasuryFee);
        newLottery.amountCollected = pendingInjectionNextLottery;
        newLottery.firstTicketId = currentTicketId;

        emit LotteryOpen(
            currentId,
            block.timestamp,
            roundLength,
            DEFAULT_PRICE,
            rewardsBreakdown,
            pendingInjectionNextLottery
        );

        // Clear record for pending injection
        pendingInjectionNextLottery = 0;
    }

    /**
     * @notice Close a lottery
     *
     * @param _lotteryId Lottery round
     */
    function closeLottery(uint256 _lotteryId) external nonReentrant {
        require(
            lotteries[_lotteryId].status == Status.Open,
            "this lottery is not open currently"
        );

        require(
            block.timestamp > lotteries[_lotteryId].endTime,
            "Not reach end time"
        );

        // Request a random number from the generator
        randomGenerator.requestRandomWords();

        // Update the lottery status to "Close"
        lotteries[_lotteryId].status = Status.Close;

        emit LotteryClose(_lotteryId);
    }

    /**
     * @notice Draw the final number, calculate reward in Degis for each group,
               and make this lottery claimable (need to wait for the random generator)
     *
     * @param _lotteryId     Lottery round
     * @param _autoInjection Auto inject funds into next lottery
     */
    function drawFinalNumberAndMakeLotteryClaimable(
        uint256 _lotteryId,
        bool _autoInjection
    ) external nonReentrant {
        require(
            lotteries[_lotteryId].status == Status.Close,
            "Lottery not closed"
        );
        require(
            _lotteryId == randomGenerator.latestLotteryId(),
            "Final number not drawn"
        );
        require(treasury != address(0), "Treasury is not set");

        // Get the final lucky numbers from randomGenerator
        uint32 finalNumber = uint32(randomGenerator.randomResult());

        Lottery storage lottery = lotteries[_lotteryId];

        // Gas savings
        uint256 totalPrize = lottery.amountCollected;

        // Prize distributed to users
        uint256 amountToWinners = (totalPrize * 8000) / 10000;

        // (20% - treasuryFee) will go to next round
        uint256 amountToNextLottery = (totalPrize *
            (2000 - lottery.treasuryFee)) / 10000;

        // Remaining part goes to treasury
        uint256 amountToTreasury = totalPrize -
            amountToWinners -
            amountToNextLottery;

        // Initialize a number to count addresses in all the previous bracket
        // Ensure that a ticket is not counted several times in different brackets
        uint256 numberAddressesInPreviousBracket;

        // Calculate prizes for each bracket, starting from the highest one
        for (uint32 i; i < 4; ) {
            uint32 j = 3 - i;

            // Get transformed winning number
            uint32 transformedWinningNumber = _bracketCalculator[j] +
                (finalNumber % (uint32(10)**(j + 1)));

            // Amount of winning tickets for this number
            uint256 winningAmount = _numberTicketsPerLotteryId[_lotteryId][
                transformedWinningNumber
            ];

            // Amount of winners for this bracket
            // Remove those already have higher bracket reward
            lottery.countWinnersPerBracket[j] =
                winningAmount -
                numberAddressesInPreviousBracket;

            // Check if there are winners for this bracket
            if (winningAmount != numberAddressesInPreviousBracket) {
                // B. If rewards at this bracket are > 0, calculate, else, report the numberAddresses from previous bracket
                if (lottery.rewardsBreakdown[j] != 0) {
                    lottery.rewardPerTicketInBracket[j] =
                        ((lottery.rewardsBreakdown[j] * amountToWinners) /
                            (winningAmount -
                                numberAddressesInPreviousBracket)) /
                        10000;

                    lottery.pendingRewards +=
                        (lottery.rewardsBreakdown[j] * amountToWinners) /
                        10000;
                }
                // No winners, prize added to the amount to withdraw to treasury
            } else {
                lottery.rewardPerTicketInBracket[j] = 0;
                amountToNextLottery +=
                    (lottery.rewardsBreakdown[j] * amountToWinners) /
                    10000;
            }

            // Update numberAddressesInPreviousBracket
            numberAddressesInPreviousBracket = winningAmount;

            unchecked {
                ++i;
            }
        }

        // Update internal statuses for this lottery round
        lottery.finalNumber = finalNumber;
        lottery.status = Status.Claimable;
        lottery.firstTicketIdNextRound = currentTicketId;

        // If auto injection is on, reinject funds into next lottery
        if (_autoInjection) {
            pendingInjectionNextLottery = amountToNextLottery;
        }

        // Transfer prize to treasury address
        if (amountToTreasury > 0) {
            DegisToken.transfer(treasury, amountToTreasury);
        }

        emit LotteryNumberDrawn(
            currentLotteryId,
            finalNumber, // final result for this round
            numberAddressesInPreviousBracket // total winners
        );
    }

    /**
     * @notice Change the random generator contract address
     *
     * @dev The calls to functions are used to verify the new generator implements them properly.
     *      It is necessary to wait for the VRF response before starting a round.
     *
     * @param _randomGeneratorAddress address of the random generator
     */
    function changeRandomGenerator(address _randomGeneratorAddress)
        external
        onlyOwner
    {
        // We do not change the generator when a round has not been claimable
        require(
            lotteries[currentLotteryId].status == Status.Claimable,
            "Round not claimable"
        );

        // Request a random number from the new generator
        IRandomNumberGenerator(_randomGeneratorAddress).requestRandomWords();

        // Get the finalNumber based on the randomResult
        IRandomNumberGenerator(_randomGeneratorAddress).randomResult();

        // Set the new address
        randomGenerator = IRandomNumberGenerator(_randomGeneratorAddress);

        emit NewRandomGenerator(_randomGeneratorAddress);
    }

    /**
     * @notice Inject funds
     *
     * @dev Those DEG transferred to this contract but not by this function
     *      will not be counted for prize pools
     *
     * @param _amount DEG amount to inject
     */
    function injectFunds(uint256 _amount) external {
        uint256 currentRound = currentLotteryId;

        // Only inject when current round is open
        require(
            lotteries[currentRound].status == Status.Open,
            "Round not open"
        );

        // Update the amount collected for this round
        lotteries[currentRound].amountCollected += _amount;

        // Transfer DEG
        DegisToken.transferFrom(msg.sender, address(this), _amount);

        emit LotteryInjection(currentRound, _amount);
    }

    /**
     * @notice Recover wrong tokens sent to the contract, only by the owner
     *          All tokens except Degis are wrong tokens
     *
     * @param _tokenAddress Address of the token to withdraw
     * @param _tokenAmount  Token amount to withdraw
     */
    function recoverWrongTokens(address _tokenAddress, uint256 _tokenAmount)
        external
        onlyOwner
    {
        require(_tokenAddress != address(DegisToken), "Cannot be DEGIS token");

        IERC20(_tokenAddress).transfer(address(msg.sender), _tokenAmount);

        emit AdminTokenRecovery(_tokenAddress, _tokenAmount);
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Internal Functions ********************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Calculate total price when buying many tickets
     *         1 ticket = 100%  2 tickets = 98%  3 tickets = 98% * 98 % ...
     *         Maximum discount: 98% ^ 10 ≈ 82%
     *
     * @param _price Ticket price in DEG
     * @param _num   Number of tickets to be bought
     *
     * @return totalPrice Total price in DEG
     */
    function _calculateTotalPrice(uint256 _price, uint256 _num)
        internal
        pure
        returns (uint256 totalPrice)
    {
        if (_num > 1) {
            uint256 discountNum = _num - 1;

            totalPrice =
                (_price * _num * (DISCOUNT_DIVISOR**discountNum)) /
                100**discountNum;
        } else {
            totalPrice = _price;
        }
    }

    /**
     * @notice returns highest bracket a ticket number falls into
     *
     * @param _lotteryId Lottery round
     * @param _ticketId  Ticket id
     */
    function _getBracket(uint256 _lotteryId, uint256 _ticketId)
        internal
        view
        returns (uint32 highestBracket)
    {
        uint32 userNumber = tickets[_ticketId].number;

        // Retrieve the winning number combination
        uint32 finalNumber = lotteries[_lotteryId].finalNumber;

        // 3 => highest prize
        // 4 => no prize
        highestBracket = 4;
        for (uint32 i = 1; i <= 4; ++i) {
            if (finalNumber % (uint32(10)**i) == userNumber % (uint32(10)**i)) {
                highestBracket = i - 1;
            } else {
                break;
            }
        }
    }

    /**
     * @notice Calculate rewards for a given ticket
     *
     * @param _lotteryId Lottery id
     * @param _ticketId  Ticket id
     * @param _bracket   Bracket for the ticketId to verify the claim and calculate rewards
     */
    function _calculateRewardsForTicketId(
        uint256 _lotteryId,
        uint256 _ticketId,
        uint32 _bracket
    ) internal view returns (uint256) {
        // Retrieve the user number combination from the ticketId
        uint32 userNumber = tickets[_ticketId].number;

        // Retrieve the winning number combination
        uint32 finalNumber = lotteries[_lotteryId].finalNumber;

        // Apply transformation to verify the claim provided by the user is true
        uint32 ts = uint32(10)**(_bracket + 1);

        uint32 transformedWinningNumber = _bracketCalculator[_bracket] +
            (finalNumber % ts);
        uint32 transformedUserNumber = _bracketCalculator[_bracket] +
            (userNumber % ts);

        // Confirm that the two transformed numbers are the same
        if (transformedWinningNumber == transformedUserNumber) {
            return lotteries[_lotteryId].rewardPerTicketInBracket[_bracket];
        } else {
            return 0;
        }
    }

    /**
     * @notice Reverse the ticket number
     *         E.g. User want to buy "1234"
     *              The input number will be 11234
     *              The reversed output will be 14321
     *
     * @param _number Input ticket number
     *
     * @return reversedNumber Reversed number + 10000
     */
    function _reverseTicketNumber(uint256 _number)
        public
        pure
        returns (uint32)
    {
        uint256 initNumber = _number - 10**4;
        uint256 singleNumber = 0;
        uint256 reversedNumber;

        for (uint256 i; i < 4; ) {
            singleNumber = initNumber % 10;

            reversedNumber = reversedNumber * 10 + singleNumber;

            initNumber /= 10;

            unchecked {
                ++i;
            }
        }
        return uint32(reversedNumber + 10000);
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
}
