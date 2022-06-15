// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IRandomNumberGenerator.sol";
import "./MathLib.sol";

contract DegisLotteryV2 is ReentrancyGuardUpgradeable, OwnableUpgradeable {
    using MathLib for uint256;
    using MathLib for int128;

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constants **************************************** //
    // ---------------------------------------------------------------------------------------- //

    // Fee
    uint256 public constant MAX_TREASURY_FEE = 3000; // 30%

    // Ticket numbers
    uint32 public constant MIN_TICKET_NUMBER = 10000;
    uint32 public constant MAX_TICKET_NUMBER = 19999;

    uint32 public constant CALCULATOR_1 = 1;
    uint32 public constant CALCULATOR_2 = 11;
    uint32 public constant CALCULATOR_3 = 111;
    uint32 public constant CALCULATOR_4 = 1111;

    uint256 public constant DEFAULT_PRICE = 10 ether;

    uint256 public constant DISCOUNT_DIVISOR = 400;

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Variables **************************************** //
    // ---------------------------------------------------------------------------------------- //

    address public treasury;

    uint256 public currentLotteryId; // Total Rounds
    uint256 public currentTicketId; // Total Tickets

    uint256 public maxNumberTicketsEachTime;

    uint256 public pendingInjectionNextLottery;

    uint256 numberAddressesInPreviousBracketWW = 0;
    uint256 numberTicketsWW = 0;

    IERC20 public DegisToken;
    IRandomNumberGenerator public randomGenerator;

    enum Status {
        Pending,
        Open,
        Closed,
        Claimable
    }

    struct Lottery {
        // Slot 1
        Status status; // uint8
        uint8 treasuryFee; // 500: 5% // 200: 2% // 50: 0.5%
        uint32 startTime;
        uint32 endTime;
        uint32 finalNumber;
        // Slot 2,3...
        uint256 ticketPrice; // 10
        uint256[4] rewardsBreakdown; // 0: 1 matching number // 3: 4 matching numbers
        uint256[4] rewardPerTicketInBracket;
        uint256[4] countWinnersPerBracket;
        uint256[4] countWinnersPerBracketWW;
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
    // e.g. in lottery round 3, 10 Tickets are sold with "1234": 3 => (1234 => 10)
    mapping(uint256 => mapping(uint32 => uint256))
        private _numberTicketsPerLotteryId;

    // Keep track of user ticket ids for a given lotteryId

    // User Address => Lottery Round => Tickets
    mapping(address => mapping(uint256 => uint256[])) private _userTicketIds;

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Events ***************************************** //
    // ---------------------------------------------------------------------------------------- //

    event MaxNumberTicketsEachTimeChanged(
        uint256 oldMaxNumber,
        uint256 newMaxNumber
    );
    event AdminTokenRecovery(address token, uint256 amount);
    event LotteryClose(uint256 indexed lotteryId);
    event LotteryInjection(uint256 indexed lotteryId, uint256 injectedAmount);
    event LotteryOpen(
        uint256 indexed lotteryId,
        uint256 startTime,
        uint256 endTime,
        uint256 priceTicketInDegis,
        uint256 injectedAmount
    );
    event LotteryNumberDrawn(
        uint256 indexed lotteryId,
        uint256 finalNumber,
        uint256 countWinningTickets
    );

    event NewRandomGenerator(address indexed randomGenerator);
    event TicketsPurchase(
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
        DegisToken = IERC20(_degis);
        randomGenerator = IRandomNumberGenerator(_randomGenerator);

        maxNumberTicketsEachTime = 10;
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
     * @notice View lottery information
     */
    function viewAllLottery() external view returns (Lottery[] memory) {
        Lottery[] memory allLottery = new Lottery[](currentLotteryId);
        for (uint256 i = 1; i <= currentLotteryId; i++) {
            allLottery[i - 1] = lotteries[i];
        }
        return allLottery;
    }

    /**
     * @notice View ticker statuses and numbers for an array of ticket ids
     * @param _ticketIds: array of _ticketId
     */
    function viewNumbersAndStatusesForTicketIds(uint256[] calldata _ticketIds)
    /// ticketIdsNumbersAndStatuses
        external
        view
        returns (uint32[] memory, bool[] memory)
    {
        uint256 length = _ticketIds.length;
        uint32[] memory ticketNumbers = new uint32[](length);
        bool[] memory ticketStatuses = new bool[](length);

        for (uint256 i = 0; i < length; i++) {
            ticketNumbers[i] = tickets[_ticketIds[i]].number;
        }

        return (ticketNumbers, ticketStatuses);
    }

    /**
     * @notice View rewards for a given ticket, providing a bracket, and lottery id
     * @dev Computations are mostly offchain. This is used to verify a ticket!
     *
     * @param _lotteryId: lottery round
     * @param _ticketId: ticket id
     */
    function viewRewardsForTicketId(uint256 _lotteryId, uint256 _ticketId)
    /// ticketIdReward
        external
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
            lotteries[_lotteryId].firstTicketId >= _ticketId
        ) {
            return 0;
        }

        uint32 highestBracket = _getBracket(_lotteryId, _ticketId);

        return
            _calculateRewardsForTicketId(_lotteryId, _ticketId, highestBracket);
    }


    // ---------------------------------------------------------------------------------------- //
    // ************************************ Set Functions ************************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Set max number can buy/claim/redeem each time
     *
     * @param _maxNumber Max number each time
     */
    function setMaxNumberTicketsEachTime(uint256 _maxNumber)
        /// setMaxTicketsPerLottery
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
     * @param _treasury wallet address
     */
    function setTreasury(address _treasury)
        external
        onlyOwner
    {
        treasury = _treasury;
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
        uint256 currentRound = currentLotteryId;
        require(
            lotteries[currentRound].status == Status.Open,
            "Current lottery round not open"
        );

        // Calculate the number of DEG to pay
        uint256 degToPay = _calculateTotalPrice(
            lotteries[currentRound].ticketPrice,
            amountToBuy
        );

        // Transfer degis tokens to this contract
        DegisToken.transferFrom(msg.sender, address(this), degToPay);

        // Increase prize pool amount
        lotteries[currentRound].amountCollected += degToPay;

        // Record the tickets bought
        for (uint256 i; i < amountToBuy; ) {
            uint32 currentTicketNumber = _ticketNumbers[i];

            require(
                (currentTicketNumber >= MIN_TICKET_NUMBER) &&
                    (currentTicketNumber <= MAX_TICKET_NUMBER),
                "Ticket number is outside the range"
            );

            // Used when drawing the prize
            _numberTicketsPerLotteryId[currentRound][
                1 + (currentTicketNumber % 10)
            ]++;
            _numberTicketsPerLotteryId[currentRound][
                11 + (currentTicketNumber % 100)
            ]++;
            _numberTicketsPerLotteryId[currentRound][
                111 + (currentTicketNumber % 1000)
            ]++;
            _numberTicketsPerLotteryId[currentRound][
                1111 + (currentTicketNumber % 10000)
            ]++;

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

        emit TicketsPurchase(msg.sender, currentRound, amountToBuy, degToPay);
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
            "Not claimable"
        );

        uint256 ticketAmount = _ticketIds.length;
        require(ticketAmount == _brackets.length, "Not same length");
        require(ticketAmount > 0, "No tickets");
        require(
            ticketAmount <= maxNumberTicketsEachTime,
            "Too many tickets to claim"
        );

        uint256 rewardToTransfer;

        for (uint256 i; i < ticketAmount; ) {
            uint256 thisTicketId = _ticketIds[i];

            // Check the ticket id is inside the range
            require(
                thisTicketId >= lotteries[_lotteryId].firstTicketId,
                "Ticket id too small"
            );
            require(
                thisTicketId < lotteries[_lotteryId].firstTicketIdNextRound,
                "Ticket id too large"
            );

            // Check the ticket is owned by the user and reset this ticket
            require(
                msg.sender == tickets[thisTicketId].owner,
                "Not the ticket owner or already claimed"
            );
            tickets[thisTicketId].owner = address(0);

            uint256 rewardForTicketId = _calculateRewardsForTicketId(
                _lotteryId,
                thisTicketId,
                _brackets[i]
            );
            require(rewardForTicketId > 0, "No prize");

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

        // Transfer the prize to winner
        lotteries[_lotteryId].pendingRewards -= rewardToTransfer;

        // Transfer the prize to the user
        DegisToken.transfer(msg.sender, rewardToTransfer);

        emit TicketsClaim(msg.sender, rewardToTransfer, _lotteryId);
    }

    /**
     * @notice Claim all winning tickets for a lottery round
     *
     * @dev Callable by users only, not contract
     *      Gas cost may be oversized, recommended to get brackets offchain first
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
            "this round of lottery are not ready for claiming"
        );

        uint256 rewardToTransfer;

        for (uint256 i; i < _userTicketIds[msg.sender][_lotteryId].length; ) {
            uint256 thisTicketId = _userTicketIds[msg.sender][_lotteryId][i];

            Ticket memory thisTicket = tickets[thisTicketId];

            require(msg.sender == thisTicket.owner, "Not the ticket owner");

            uint32 highestBracket = _getBracket(_lotteryId, thisTicketId);

            uint256 rewardForTicketId = _calculateRewardsForTicketId(
                _lotteryId,
                thisTicketId,
                highestBracket
            );

            require(rewardForTicketId > 0, "No prize");

            // Increase the reward to transfer
            rewardToTransfer += rewardForTicketId;

            unchecked {
                ++i;
            }
        }

        // Transfer the prize to winner
        lotteries[_lotteryId].pendingRewards -= rewardToTransfer;

        DegisToken.transfer(msg.sender, rewardToTransfer);

        emit TicketsClaim(msg.sender, rewardToTransfer, _lotteryId);
    }

    /**
     * @notice Start the lottery
     *
     * @param _endTime          EndTime of the lottery
     * @param _ticketPrice      Price of each ticket without discount
     * @param _rewardsBreakdown Breakdown of rewards per bracket (must sum to 10,000)(100 <=> 1)
     * @param _fee              Treasury fee (10,000 = 100%, 100 = 1%) (set as 0)
     */
    function startLottery(
        uint256 _endTime,
        uint256 _ticketPrice,
        uint256[4] calldata _rewardsBreakdown,
        uint256 _fee
    ) external onlyOwner {
        require(
            (currentLotteryId == 0) ||
                (lotteries[currentLotteryId].status == Status.Claimable),
            "Wrong status"
        );

        require(_fee <= MAX_TREASURY_FEE, "Treasury fee too high");

        require(
               (_rewardsBreakdown[0] +
                _rewardsBreakdown[1] +
                _rewardsBreakdown[2] +
                _rewardsBreakdown[3]) <= 10000,
            "Rewards breakdown too high"
        );

        // If price is provided, use it
        // Or use the default price
        uint256 price = _ticketPrice > 0 ? _ticketPrice : DEFAULT_PRICE;

        // Gas savings
        uint256 currentId = ++currentLotteryId;

        Lottery storage newLottery = lotteries[currentId];

        newLottery.status = Status.Open;
        newLottery.startTime = uint32(block.timestamp);
        newLottery.endTime = uint32(_endTime);
        newLottery.ticketPrice = price;
        newLottery.rewardsBreakdown = _rewardsBreakdown;
        newLottery.treasuryFee = uint8(_fee);
        newLottery.amountCollected = pendingInjectionNextLottery;

        emit LotteryOpen(
            currentId,
            block.timestamp,
            _endTime,
            price,
            pendingInjectionNextLottery
        );

        pendingInjectionNextLottery = 0;
    }

    /**
     * @notice Close a lottery
     * @param _lotteryId lottery round
     * @dev Callable only by the owner
     */
    function closeLottery(uint256 _lotteryId) external onlyOwner nonReentrant {
        require(
            lotteries[_lotteryId].status == Status.Open,
            "this lottery is not open currently"
        );

        // require(
        //     block.timestamp > _lotteries[_lotteryId].endTime,
        //     "this lottery has not reached the end time, only can be closed after the end time"
        // );

        // Request a random number from the generator
        randomGenerator.getRandomNumber();

        // Update the lottery status to "Closed"
        lotteries[_lotteryId].status = Status.Closed;

        emit LotteryClose(_lotteryId);
    }

    /**
     * @notice Draw the final number, calculate reward in Degis for each group,
               and make this lottery claimable (need to wait for the random generator)
     * @param _lotteryId lottery round
     * @param _autoInjection reinjects funds into next lottery
     * @dev Callable only by the owner
     */
    function drawFinalNumberAndMakeLotteryClaimable(
        //makeLotteryClaimable (final number is drawed when the lottery is closed)
        uint256 _lotteryId,
        bool _autoInjection
    ) external onlyOwner nonReentrant {
        require(
            lotteries[_lotteryId].status == Status.Closed,
            "this lottery has not closed, you should first close it"
        );
        require(
            _lotteryId == randomGenerator.latestLotteryId(),
            "the final lucky numbers have not been drawn"
        );
        require(treasury != address(0), "Treasury is not set");

        // Get the final lucky numbers from randomGenerator
        uint32 finalNumber = randomGenerator.randomResult();

        // Calculate the prize amount given to winners
        // Currently treasuryFee = 0 => amountToWinners = amountCollected
        uint256 amountToWinners = (
            ((lotteries[_lotteryId].amountCollected) *
                (10000 - lotteries[_lotteryId].treasuryFee))
        ) / 10000;

        // Calculate prizes for each bracket, starting from the highest one
        // Initialize a number to count addresses in all the previous bracket
        // Ensure that a ticket is not counted several times in different brackets
        uint256 numberAddressesInPreviousBracket;
        numberAddressesInPreviousBracketWW = 0;
        lotteries[_lotteryId].pendingRewards = 0;

        for (uint32 i = 0; i < 4; i++) {
            uint32 j = 3 - i;
            // Get transformed winning number
            uint32 transformedWinningNumber = _getCalculator(j) +
                (finalNumber % (uint32(10)**(j + 1)));

            uint256 numberTickets = 0;
            numberTicketsWW = 0;
            for (uint32 k = 1; k <= _lotteryId; k++) {
                numberTickets +=
                    _numberTicketsPerLotteryId[k][transformedWinningNumber] *
                    (int2ln(_lotteryId - k + 1) + 10000);

                numberTicketsWW += _numberTicketsPerLotteryId[k][
                    transformedWinningNumber
                ];
            }

            lotteries[_lotteryId].countWinnersPerBracket[j] =
                numberTickets -
                numberAddressesInPreviousBracket;
            lotteries[_lotteryId].countWinnersPerBracketWW[j] =
                numberTicketsWW -
                numberAddressesInPreviousBracketWW;

            // If there are winners for this _bracket
            if (numberTickets - numberAddressesInPreviousBracket != 0) {
                // B. If rewards at this bracket are > 0, calculate, else, report the numberAddresses from previous bracket
                if (lotteries[_lotteryId].rewardsBreakdown[j] != 0) {
                    lotteries[_lotteryId].rewardPerTicketInBracket[j] =
                        ((lotteries[_lotteryId].rewardsBreakdown[j] *
                            amountToWinners) /
                            (numberTickets -
                                numberAddressesInPreviousBracket)) /
                        10000;
                    lotteries[_lotteryId].pendingRewards +=
                        (lotteries[_lotteryId].rewardsBreakdown[j] *
                            amountToWinners) /
                        10000;
                }
                // No winners, prize added to the amount to withdraw to treasury
            } else {
                lotteries[_lotteryId].rewardPerTicketInBracket[j] = 0;
            }

            // Update numberAddressesInPreviousBracket
            numberAddressesInPreviousBracket = numberTickets;
            numberAddressesInPreviousBracketWW = numberTicketsWW;
        }

        // Update internal statuses for this lottery round
        lotteries[_lotteryId].finalNumber = finalNumber;
        lotteries[_lotteryId].status = Status.Claimable;

        uint256 amountToTreasury = 0;
        amountToTreasury =
            amountToWinners -
            lotteries[_lotteryId].pendingRewards;

        // If autoInjection, all unused prize will be rolled to next round
        if (_autoInjection) {
            pendingInjectionNextLottery = amountToTreasury;
            amountToTreasury = 0;
        }

        // Amount to treasury from the treasuryFee part
        amountToTreasury += (lotteries[_lotteryId].amountCollected -
            amountToWinners);

        // Transfer prize to treasury address
        if (amountToTreasury > 0) {
            DegisToken.transfer(treasury, amountToTreasury);
        }

        require(
            _calculateTotalAwards() == DegisToken.balanceOf(address(this)),
            "No Degis balance"
        );

        emit LotteryNumberDrawn(
            currentLotteryId,
            finalNumber, // final result for this round
            numberAddressesInPreviousBracket // total winners
        );
    }

    /**
     * @notice Change the random generator contract address
     * @dev The calls to functions are used to verify the new generator implements them properly.
     * It is necessary to wait for the VRF response before starting a round.
     * Callable only by the contract owner
     * @param _randomGeneratorAddress address of the random generator
     */
    function changeRandomGenerator(address _randomGeneratorAddress)
        external
        onlyOwner
    {
        require(
            lotteries[currentLotteryId].status == Status.Claimable,
            "current lottery is not claimable"
        );

        // Request a random number from the new generator
        IRandomNumberGenerator(_randomGeneratorAddress).getRandomNumber();

        // Get the finalNumber based on the randomResult
        IRandomNumberGenerator(_randomGeneratorAddress).randomResult();

        // Set the new address
        randomGenerator = IRandomNumberGenerator(_randomGeneratorAddress);

        emit NewRandomGenerator(_randomGeneratorAddress);
    }

    /**
     * @notice Inject funds
     *
     * @param _amount Amount to inject
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

        uint256 degBalance = DegisToken.balanceOf(address(this));
        require(_calculateTotalAwards() <= degBalance, "Wrong deg amount");

        emit LotteryInjection(currentRound, _amount);
    }

    /**
     * @notice Recover wrong tokens sent to the contract, only by the owner
               All tokens except Degis and USDC are wrong tokens
     * @param _tokenAddress the address of the token to withdraw
     * @param _tokenAmount token amount to withdraw
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
     * @notice turns x into a logarithmic number
     *
     * @param _x number
     */
    function int2ln(uint256 x) internal pure returns (uint256) {
        // return (x-1)*10000;
        uint256 y = 10000;
        int128 x_128 = x.fromUInt();
        int128 y_128 = y.fromUInt();
        int128 ln_x_128 = x_128.ln();
        ln_x_128 = ln_x_128.mul(y_128);
        return ln_x_128.toUInt();
    }

    /**
     * @notice Calculate rewards for a given ticket, in given round and given bracket
     *
     * @param _lotteryId Lottery round
     * @param _ticketId  Ticket id
     * @param _bracket   Bracket to be calculated inside
     */
    function _calculateRewardsForTicketId(
        uint256 _lotteryId,
        uint256 _ticketId,
        uint32 _bracket
    ) internal view returns (uint256) {
        // Retrieve the user number combination from the ticketId
        uint32 userNumber = tickets[_ticketId].number;

        // Retrieve the winning number combination
        uint32 winningNumber = lotteries[_lotteryId].finalNumber;

        // Apply transformation to verify the claim provided by the user is true
        uint32 ts = uint32(10)**(_bracket + 1);

        uint32 transformedWinningNumber = _getCalculator(_bracket) +
            (winningNumber % ts);
        uint32 transformedUserNumber = _getCalculator(_bracket) +
            (userNumber % ts);

        // Confirm that the two transformed numbers are the same
        if (transformedWinningNumber == transformedUserNumber) {
            return lotteries[_lotteryId].rewardPerTicketInBracket[_bracket];
        } else {
            return 0;
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
        uint32 winningNumber = lotteries[_lotteryId].finalNumber;

        // Smaller number => more prize
        // 0 => highest prize
        // 4 => no prize
        highestBracket = 4;
        for (uint32 i = 1; i <= 4; ++i) {
            if (
                winningNumber % (uint32(10)**i) == userNumber % (uint32(10)**i)
            ) {
                highestBracket = i - 1;
            }
        }
    }

    /**
     * @notice Calculate all awards
     */
    function _calculateTotalAwards() internal view returns (uint256) {
        uint256 amount;

        for (uint256 i; i < currentTicketId; i++) {
            amount += lotteries[i].pendingRewards;
        }

        if (lotteries[currentLotteryId].status == Status.Claimable) {
            amount +=
                lotteries[currentLotteryId].pendingRewards +
                pendingInjectionNextLottery;
        } else {
            amount += lotteries[currentLotteryId].amountCollected;
        }

        return amount;
    }
    
    /**
     * @notice Calculate total price when buying many tickets
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
        totalPrice =
            (_price * _num * (DISCOUNT_DIVISOR + 1 - _num)) /
            DISCOUNT_DIVISOR;
    }

    /**
     * @notice View user ticket ids, numbers, and statuses of user for a given lottery
     * @param _user: user address
     * @param _lotteryId: lottery round
     * @param _cursor: cursor to start where to retrieve the tickets
     * @param _size: the number of tickets to retrieve
     */
    // e.g. Alice, round 10, check her ticket-30 to ticket-35
    // function viewUserInfoForLotteryId(
    //     address _user,
    //     uint256 _lotteryId,
    //     uint256 _cursor,
    //     uint256 _size
    // )
    //     external
    //     view
    //     returns (
    //         uint256[] memory,
    //         uint32[] memory,
    //         bool[] memory,
    //         uint256
    //     )
    // {
    //     uint256 length = _size;
    //     uint256 amount = _userTicketIds[_user][_lotteryId].length;

    //     if (length > (amount - _cursor)) {
    //         length = amount - _cursor;
    //     }

    //     uint256[] memory lotteryTicketIds = new uint256[](length);
    //     uint32[] memory ticketNumbers = new uint32[](length);
    //     bool[] memory ticketStatuses = new bool[](length);

    //     for (uint256 i = 0; i < length; i++) {
    //         lotteryTicketIds[i] = _userTicketIds[_user][i + _cursor];
    //         ticketNumbers[i] = tickets[lotteryTicketIds[i]].number;
    //         ticketStatuses[i] = tickets[lotteryTicketIds[i]].isRedeemed;
    //     }

    //     return (
    //         lotteryTicketIds,
    //         ticketNumbers,
    //         ticketStatuses,
    //         _cursor + length
    //     );
    // }

    /**
     * @notice View user ticket ids, numbers, and statuses of user for a given lottery
     * @param _user: user address
     */
    // e.g. Alice, round 10, check her ticket-30 to ticket-35
    // function viewUserInfo(address _user)
    //     external
    //     view
    //     returns (uint256[] memory, Ticket[] memory)
    // {
    //     uint256 length = _userTicketIds[_user].length;

    //     uint256[] memory ticketIds = new uint256[](length);
    //     Ticket[] memory userTickets = new Ticket[](length);

    //     for (uint256 i = 0; i < length; i++) {
    //         ticketIds[i] = _userTicketIds[_user][i];
    //         userTickets[i] = tickets[ticketIds[i]];
    //     }

    //     return (ticketIds, userTickets);
    // }

    /**
     * @notice Claim all winning tickets for a lottery
     * @param _lotteryId: lottery id
     * @dev Callable by users only, not contract!
     */
    // struct viewClaimAllTicketInfo {
    //     uint256 ticketId;
    //     uint256 ticketNumber;
    //     uint256 ticketReward;
    //     bool ticketClaimed;
    // }

    // function viewClaimAllTickets(uint256 _lotteryId)
    //     external
    //     view
    //     returns (
    //         uint256,
    //         uint256,
    //         viewClaimAllTicketInfo[] memory
    //     )
    // {
    //     require(
    //         lotteries[_lotteryId].status == Status.Claimable,
    //         "this round of lottery are not ready for claiming"
    //     );

    //     uint256 length = _userTicketIds[msg.sender].length;
    //     uint256 rewardToTransfer = 0;
    //     viewClaimAllTicketInfo[]
    //         memory tmpTicketInfo = new viewClaimAllTicketInfo[](length);

    //     uint256 num = 0;
    //     for (uint256 i = 0; i < _userTicketIds[msg.sender].length; i++) {
    //         uint256 thisTicketId = _userTicketIds[msg.sender][i];

    //         require(
    //             msg.sender == tickets[thisTicketId].owner,
    //             "you are not the owner of this ticket"
    //         );

    //         if (tickets[thisTicketId].buyLotteryId > _lotteryId) {
    //             continue;
    //         }

    //         if (tickets[thisTicketId].isRedeemed) {
    //             if (tickets[thisTicketId].redeemLotteryId <= _lotteryId) {
    //                 continue;
    //             }
    //         }

    //         uint256 rewardForTicketId = _calculateRewardsForTicketId(
    //             _lotteryId,
    //             thisTicketId
    //         );

    //         if (rewardForTicketId == 0) {
    //             continue;
    //         }

    //         tmpTicketInfo[num].ticketId = thisTicketId;
    //         tmpTicketInfo[num].ticketNumber = tickets[thisTicketId].number;
    //         tmpTicketInfo[num].ticketReward = rewardForTicketId;
    //         num += 1;

    //         // Increase the reward to transfer
    //         rewardToTransfer += rewardForTicketId;
    //     }

    //     viewClaimAllTicketInfo[]
    //         memory ticketInfo = new viewClaimAllTicketInfo[](num);

    //     for (uint256 i = 0; i < num; i++) {
    //         ticketInfo[i] = tmpTicketInfo[i];
    //     }

    //     return (_lotteryId, rewardToTransfer, ticketInfo);
    // }

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

    function _getCalculator(uint256 index) internal pure returns (uint32) {
        if (index == 1) return CALCULATOR_1;
        else if (index == 2) return CALCULATOR_2;
        else if (index == 3) return CALCULATOR_3;
        else return CALCULATOR_4;
    }
}
