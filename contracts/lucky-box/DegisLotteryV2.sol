// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IRandomNumberGenerator.sol";
import "./MathLib.sol";

contract DegisLotteryV2 is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    using MathLib for uint256;
    using MathLib for int128;

    address public injectorAddress;
    address public operatorAddress;
    address public treasuryAddress; // Currently no treasury fee

    uint256 public currentLotteryId; // Total Rounds
    uint256 public currentTicketId; // Total Tickets

    uint256 public maxNumberTicketsPerBuyOrClaim = 10000;
    uint256 public maxNumberTicketsPerRedeem = 10000;

    uint256 public ticketPrice;

    uint256 public pendingInjectionNextLottery;

    uint256 public constant MIN_LENGTH_LOTTERY = 1 hours - 5 minutes; // 1 hours
    uint256 public constant MAX_LENGTH_LOTTERY = 365 days + 5 minutes; // 365 days
    uint256 public constant MAX_TREASURY_FEE = 3000; // 30%
    uint32 public constant MIN_TICKET_NUMBER = 10000;
    uint32 public constant MAX_TICKET_NUMBER = 19999;

    IERC20 public DegisToken;
    IERC20 public USDCToken;
    IRandomNumberGenerator public randomGenerator;

    enum Status {
        Pending,
        Open,
        Close,
        Claimable
    }

    struct Lottery {
        Status status;
        uint256 startTime;
        uint256 endTime;
        uint256 ticketPrice; // 10
        uint256[4] rewardsBreakdown; // 0: 1 matching number // 3: 4 matching numbers
        uint256 treasuryFee; // 500: 5% // 200: 2% // 50: 0.5%
        uint256[4] rewardPerTicketInBracket;
        uint256[4] countWinnersPerBracket;
        uint256[4] countWinnersPerBracketWW;
        uint256 amountCollected;
        uint256 pendingAwards;
        uint32 finalNumber;
    }

    struct Ticket {
        uint32 number;
        bool isRedeemed;
        uint256 buyLotteryId;
        uint256 redeemLotteryId;
        uint256 priceTicket;
        address owner;
    }

    // ticketId => (LotteryId => Whether claimed)
    mapping(uint256 => mapping(uint256 => bool)) private _ticketsClaimed;

    // lotteryId => Lottery Info
    mapping(uint256 => Lottery) private _lotteries;

    // ticketId => Ticket Info
    mapping(uint256 => Ticket) private _tickets;

    // Bracket calculator is used for verifying claims for ticket prizes
    mapping(uint32 => uint32) private _bracketCalculator;

    // lotteryId => (Lucky Number => Total Amount of this number)
    // e.g. in lottery round 3, 10 Tickets are sold with "1234": 3 => (1234 => 10)
    mapping(uint256 => mapping(uint32 => uint256))
        private _numberTicketsPerLotteryId;

    // Keep track of user ticket ids for a given lotteryId

    // userAddress => all tickets he bought in this round
    mapping(address => uint256[]) private _userTicketIds;

    // only user address
    modifier notContract() {
        require(!_isContract(msg.sender), "Contract not allowed");
        require(msg.sender == tx.origin, "Proxy contract not allowed");
        _;
    }

    modifier onlyOperator() {
        require(msg.sender == operatorAddress, "Not operator");
        _;
    }

    modifier onlyOwnerOrInjector() {
        require(
            (msg.sender == owner()) || (msg.sender == injectorAddress),
            "Not owner or injector"
        );
        _;
    }

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
    event NewOperatorAndTreasuryAndInjectorAddresses(
        address operator,
        address treasury,
        address injector
    );

    event NewRandomGenerator(address indexed randomGenerator);
    event TicketsPurchase(
        address indexed buyer,
        uint256 indexed lotteryId,
        uint256 numberTickets
    );
    event TicketsRedeem(
        address indexed redeemer,
        uint256 indexed lotteryId,
        uint256 numberTickets
    );
    event TicketsClaim(
        address indexed claimer,
        uint256 amount,
        uint256 indexed lotteryId
    );

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
        DegisToken = IERC20(_degisTokenAddress);
        USDCToken = IERC20(_usdcTokenAddress);
        randomGenerator = IRandomNumberGenerator(_randomGeneratorAddress);

        // Initializes the bracketCalculator, constant numbers
        _bracketCalculator[0] = 1;
        _bracketCalculator[1] = 11;
        _bracketCalculator[2] = 111;
        _bracketCalculator[3] = 1111;
    }

    function initialize() public {
        ticketPrice = 10 ether;
    }

    /**
     * @notice Buy tickets for the current lottery round
     * @dev You need to transfer the 4-digit number to a 5-digit number to be used here (+10000)
     * @dev Can not be called by a smart contract
     * @param _ticketNumbers array of ticket numbers between 10,000 and 19,999
     */
    function buyTickets(uint32[] calldata _ticketNumbers)
        external
        notContract
        nonReentrant
    {
        require(_ticketNumbers.length != 0, "No tickets are being bought");
        require(
            _ticketNumbers.length <= maxNumberTicketsPerBuyOrClaim,
            "too many tickets are being bought at one time"
        );

        uint256 currentId = currentLotteryId;
        require(
            _lotteries[currentId].status == Status.Open,
            "Sorry, current lottery is not open"
        );

        uint256 amountToBuy = _ticketNumbers.length;

        // Calculate number of Degis that the user need to pay
        uint256 amountDegisToTransfer = _lotteries[currentId].ticketPrice *
            amountToBuy;

        // Transfer degis tokens to this contract (need approval)
        DegisToken.safeTransferFrom(
            address(msg.sender),
            address(this),
            amountDegisToTransfer
        );

        for (uint256 i = 0; i < amountToBuy; i++) {
            uint32 currentTicketNumber = _ticketNumbers[i];

            require(
                (currentTicketNumber >= MIN_TICKET_NUMBER) &&
                    (currentTicketNumber <= MAX_TICKET_NUMBER),
                "Ticket number is outside the range"
            );

            // used when drawing the prize
            _numberTicketsPerLotteryId[currentId][
                1 + (currentTicketNumber % 10)
            ]++;
            _numberTicketsPerLotteryId[currentId][
                11 + (currentTicketNumber % 100)
            ]++;
            _numberTicketsPerLotteryId[currentId][
                111 + (currentTicketNumber % 1000)
            ]++;
            _numberTicketsPerLotteryId[currentId][
                1111 + (currentTicketNumber % 10000)
            ]++;

            // Store this ticket number to the user's record
            _userTicketIds[msg.sender].push(currentId);

            // Store this ticket number to global ticket state
            _tickets[currentTicketId] = Ticket({
                number: currentTicketNumber,
                owner: msg.sender,
                buyLotteryId: currentLotteryId,
                isRedeemed: false,
                redeemLotteryId: 0,
                priceTicket: _lotteries[currentId].ticketPrice
            });

            _ticketsClaimed[currentTicketId][currentLotteryId] = false;

            // Increase total lottery ticket number
            currentTicketId++;
        }

        emit TicketsPurchase(msg.sender, currentLotteryId, amountToBuy);
    }

    /**
     * @notice Redeem tickets for all lottery
     * @param _ticketIds Array of ticket ids
     * @dev Callable by users
     */
    function redeemTickets(uint256[] calldata _ticketIds)
        external
        notContract
        nonReentrant
    {
        require(_ticketIds.length != 0, "no tickets are being bought");
        require(
            _ticketIds.length <= maxNumberTicketsPerRedeem,
            "Too many tickets are being remeeded at one time"
        );
        require(
            _lotteries[currentLotteryId].status == Status.Open,
            "Sorry, current lottery is not open"
        );
        // require(
        //     block.timestamp < _lotteries[currentLotteryId].endTime,
        //     "sorry, current lottery is over"
        // );

        uint256 amountDegisToTransfer = 0;
        for (uint256 i = 0; i < _ticketIds.length; i++) {
            uint256 thisTicketId = _ticketIds[i];
            require(currentTicketId > thisTicketId, "ticketId is too large");
            require(
                msg.sender == _tickets[thisTicketId].owner,
                "you are not the owner of this ticket"
            );
            require(
                _tickets[thisTicketId].isRedeemed == false,
                "ticket has been redeemed"
            );

            _tickets[thisTicketId].isRedeemed = true;
            _tickets[thisTicketId].redeemLotteryId = currentLotteryId;
            amountDegisToTransfer += _tickets[thisTicketId].priceTicket;

            uint32 currentTicketNumber = _tickets[thisTicketId].number;

            // used when drawing the prize
            _numberTicketsPerLotteryId[_tickets[thisTicketId].buyLotteryId][
                1 + (currentTicketNumber % 10)
            ]--;
            _numberTicketsPerLotteryId[_tickets[thisTicketId].buyLotteryId][
                11 + (currentTicketNumber % 100)
            ]--;
            _numberTicketsPerLotteryId[_tickets[thisTicketId].buyLotteryId][
                111 + (currentTicketNumber % 1000)
            ]--;
            _numberTicketsPerLotteryId[_tickets[thisTicketId].buyLotteryId][
                1111 + (currentTicketNumber % 10000)
            ]--;
        }

        DegisToken.safeTransfer(address(msg.sender), amountDegisToTransfer);

        emit TicketsRedeem(msg.sender, currentLotteryId, _ticketIds.length);
    }

    /**
     * @notice Claim a set of winning tickets for a lottery
     * @param _lotteryId lottery id
     * @dev Callable by users only, not contract!
     */
    function claimTickets(uint256 _lotteryId, uint256[] calldata _ticketIds)
        external
        notContract
        nonReentrant
    {
        require(
            _lotteries[_lotteryId].status == Status.Claimable,
            "this round of lottery are not ready for claiming"
        );
        require(_ticketIds.length != 0, "no ticketIds given");
        require(
            _ticketIds.length <= maxNumberTicketsPerBuyOrClaim,
            "too many tickets to claim at one time"
        );

        uint256 rewardToTransfer;

        for (uint256 i = 0; i < _ticketIds.length; i++) {
            uint256 thisTicketId = _ticketIds[i];

            require(
                msg.sender == _tickets[thisTicketId].owner,
                "you are not the owner of this ticket"
            );
            require(
                _tickets[thisTicketId].buyLotteryId <= _lotteryId,
                "ticketId is too large"
            );

            if (_tickets[thisTicketId].isRedeemed == true) {
                require(
                    _tickets[thisTicketId].redeemLotteryId > _lotteryId,
                    "ticketId was redeemed"
                );
            }

            require(
                _ticketsClaimed[thisTicketId][_lotteryId] == false,
                "prize received"
            );

            uint256 rewardForTicketId = _calculateRewardsForTicketId(
                _lotteryId,
                thisTicketId
            );

            require(rewardForTicketId != 0, "no prize for this bracket");

            _ticketsClaimed[thisTicketId][_lotteryId] = true;

            // Increase the reward to transfer
            rewardToTransfer += rewardForTicketId;
        }

        // Transfer the prize to winner
        USDCToken.safeTransfer(msg.sender, rewardToTransfer);
        _lotteries[_lotteryId].pendingAwards -= rewardToTransfer;

        emit TicketsClaim(msg.sender, rewardToTransfer, _lotteryId);
    }

    /**
     * @notice Claim all winning tickets for a lottery
     * @param _lotteryId lottery id
     * @dev Callable by users only, not contract!
     */
    function claimAllTickets(uint256 _lotteryId)
        external
        notContract
        nonReentrant
    {
        require(
            _lotteries[_lotteryId].status == Status.Claimable,
            "this round of lottery are not ready for claiming"
        );

        uint256 rewardToTransfer;

        for (uint256 i = 0; i < _userTicketIds[msg.sender].length; i++) {
            uint256 thisTicketId = _userTicketIds[msg.sender][i];

            require(
                msg.sender == _tickets[thisTicketId].owner,
                "you are not the owner of this ticket"
            );

            if (_tickets[thisTicketId].buyLotteryId > _lotteryId) {
                continue;
            }

            if (_tickets[thisTicketId].isRedeemed == true) {
                if (_tickets[thisTicketId].redeemLotteryId <= _lotteryId) {
                    continue;
                }
            }

            if (_ticketsClaimed[thisTicketId][_lotteryId] == true) {
                continue;
            }

            uint256 rewardForTicketId = _calculateRewardsForTicketId(
                _lotteryId,
                thisTicketId
            );

            if (rewardForTicketId == 0) {
                continue;
            }

            _ticketsClaimed[thisTicketId][_lotteryId] = true;

            // Increase the reward to transfer
            rewardToTransfer += rewardForTicketId;
        }

        require(rewardToTransfer != 0, "no prize");

        // Transfer the prize to winner
        USDCToken.safeTransfer(msg.sender, rewardToTransfer);
        _lotteries[_lotteryId].pendingAwards -= rewardToTransfer;

        emit TicketsClaim(msg.sender, rewardToTransfer, _lotteryId);
    }

    /**
     * @notice Close a lottery
     * @param _lotteryId lottery round
     * @dev Callable only by the operator
     */
    function closeLottery(uint256 _lotteryId)
        external
        onlyOperator
        nonReentrant
    {
        require(
            _lotteries[_lotteryId].status == Status.Open,
            "this lottery is not open currently"
        );

        // require(
        //     block.timestamp > _lotteries[_lotteryId].endTime,
        //     "this lottery has not reached the end time, only can be closed after the end time"
        // );

        // Request a random number from the generator
        randomGenerator.getRandomNumber();

        // Update the lottery status to "Close"
        _lotteries[_lotteryId].status = Status.Close;

        emit LotteryClose(_lotteryId);
    }

    function int2ln(uint256 x) internal pure returns (uint256) {
        // return (x-1)*10000;
        uint256 y = 10000;
        int128 x_128 = x.fromUInt();
        int128 y_128 = y.fromUInt();
        int128 ln_x_128 = x_128.ln();
        ln_x_128 = ln_x_128.mul(y_128);
        return ln_x_128.toUInt();
    }

    

    uint256 numberAddressesInPreviousBracketWW = 0;
    uint256 numberTicketsWW = 0;

    /**
     * @notice Draw the final number, calculate reward in Degis for each group, 
               and make this lottery claimable (need to wait for the random generator)
     * @param _lotteryId lottery round
     * @param _autoInjection reinjects funds into next lottery 
     * @dev Callable only by the operator
     */
    function drawFinalNumberAndMakeLotteryClaimable(
        uint256 _lotteryId,
        bool _autoInjection
    ) external onlyOperator nonReentrant {
        require(
            _lotteries[_lotteryId].status == Status.Close,
            "this lottery has not closed, you should first close it"
        );
        require(
            _lotteryId == randomGenerator.latestLotteryId(),
            "the final lucky numbers have not been drawn"
        );

        // Get the final lucky numbers from randomGenerator
        uint32 finalNumber = randomGenerator.randomResult();

        // Calculate the prize amount given to winners
        // Currently treasuryFee = 0 => amountToWinners = amountCollected
        uint256 amountToWinners = (
            ((_lotteries[_lotteryId].amountCollected) *
                (10000 - _lotteries[_lotteryId].treasuryFee))
        ) / 10000;

        // Calculate prizes for each bracket, starting from the highest one

        // Initialize a number to count addresses in all the previous bracket
        // Ensure that a ticket is not counted several times in different brackets
        uint256 numberAddressesInPreviousBracket;
        numberAddressesInPreviousBracketWW = 0;
        _lotteries[_lotteryId].pendingAwards = 0;

        for (uint32 i = 0; i < 4; i++) {
            uint32 j = 3 - i;
            // Get transformed winning number
            uint32 transformedWinningNumber = _bracketCalculator[j] +
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

            _lotteries[_lotteryId].countWinnersPerBracket[j] =
                numberTickets -
                numberAddressesInPreviousBracket;
            _lotteries[_lotteryId].countWinnersPerBracketWW[j] =
                numberTicketsWW -
                numberAddressesInPreviousBracketWW;

            // If there are winners for this _bracket
            if (numberTickets - numberAddressesInPreviousBracket != 0) {
                // B. If rewards at this bracket are > 0, calculate, else, report the numberAddresses from previous bracket
                if (_lotteries[_lotteryId].rewardsBreakdown[j] != 0) {
                    _lotteries[_lotteryId].rewardPerTicketInBracket[j] =
                        ((_lotteries[_lotteryId].rewardsBreakdown[j] *
                            amountToWinners) /
                            (numberTickets -
                                numberAddressesInPreviousBracket)) /
                        10000;
                    _lotteries[_lotteryId].pendingAwards +=
                        (_lotteries[_lotteryId].rewardsBreakdown[j] *
                            amountToWinners) /
                        10000;
                }
                // No winners, prize added to the amount to withdraw to treasury
            } else {
                _lotteries[_lotteryId].rewardPerTicketInBracket[j] = 0;
            }

            // Update numberAddressesInPreviousBracket
            numberAddressesInPreviousBracket = numberTickets;
            numberAddressesInPreviousBracketWW = numberTicketsWW;
        }

        // Update internal statuses for this lottery round
        _lotteries[_lotteryId].finalNumber = finalNumber;
        _lotteries[_lotteryId].status = Status.Claimable;

        uint256 amountToTreasury = 0;
        amountToTreasury =
            amountToWinners -
            _lotteries[_lotteryId].pendingAwards;

        // If autoInjection, all unused prize will be rolled to next round
        if (_autoInjection) {
            pendingInjectionNextLottery = amountToTreasury;
            amountToTreasury = 0;
        }

        // Amount to treasury from the treasuryFee part
        amountToTreasury += (_lotteries[_lotteryId].amountCollected -
            amountToWinners);

        // Transfer prize to treasury address
        if (amountToTreasury > 0) {
            USDCToken.safeTransfer(treasuryAddress, amountToTreasury);
        }

        require(
            _calculateTotalAwards() == USDCToken.balanceOf(address(this)),
            "USDC not balance"
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
            _lotteries[currentLotteryId].status == Status.Claimable,
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
     * @param _amount amount to inject
     */
    function injectFunds(uint256 _amount) external onlyOwnerOrInjector {
        uint256 currentId = currentLotteryId;
        require(_lotteries[currentId].status == Status.Open, "Round not open");

        // Transfer usd tokens to this contract (need approval)
        USDCToken.safeTransferFrom(address(msg.sender), address(this), _amount);

        uint256 USDC_Balance = USDCToken.balanceOf(address(this));
        _lotteries[currentId].amountCollected += _amount;

        require(_calculateTotalAwards() <= USDC_Balance, "the amount is wrong");

        emit LotteryInjection(currentId, _amount);
    }

    /**
     * @notice Start the lottery
     * @dev Callable only by operator
     * @param _endTime endTime of the lottery (timestamp in s)
     * @param _rewardsBreakdown breakdown of rewards per bracket (must sum to 10,000)(100 <=> 1)
     * @param _treasuryFee treasury fee (10,000 = 100%, 100 = 1%) (set as 0)
     */
    function startLottery(
        uint256 _endTime,
        uint256[4] calldata _rewardsBreakdown,
        uint256 _treasuryFee
    ) external onlyOperator {
        require(
            (currentLotteryId == 0) ||
                (_lotteries[currentLotteryId].status == Status.Claimable),
            "Not time to start lottery"
        );

        uint256 price = ticketPrice;

        require(_treasuryFee <= MAX_TREASURY_FEE, "treasury fee is too high");

        require(
            (_rewardsBreakdown[0] +
                _rewardsBreakdown[1] +
                _rewardsBreakdown[2] +
                _rewardsBreakdown[3]) <= 10000,
            "total rewards of each bracket must less than or equal to 10000"
        );

        uint256 currentId = ++currentLotteryId;

        Lottery storage newLottery = _lotteries[currentId];

        newLottery.status = Status.Open;
        newLottery.startTime = block.timestamp;
        newLottery.endTime = _endTime;
        newLottery.ticketPrice = price;
        newLottery.rewardsBreakdown = _rewardsBreakdown;
        newLottery.treasuryFee = _treasuryFee;
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

        IERC20(_tokenAddress).safeTransfer(address(msg.sender), _tokenAmount);

        emit AdminTokenRecovery(_tokenAddress, _tokenAmount);
    }

    error DLT__ZeroPrice();
    event TicketPriceChanged(uint256 oldPrice, uint256 newPrice);

    /**
     * @notice Set the ticket price
     * @dev Only callable by the owner
     * @param _price New ticket price
     */
    function setTicketPrice(uint256 _price) external onlyOwner {
        if (_price == 0) revert DLT__ZeroPrice();

        emit TicketPriceChanged(ticketPrice, _price);

        ticketPrice = _price;
    }

    /**
     * @notice Set max number of tickets that a user can buy/claim at one time
     * @dev Only callable by the owner
     */
    function setMaxNumberTicketsPeyBuyOrClaim(uint256 _maxNumber)
        external
        onlyOwner
    {
        require(_maxNumber != 0, "Must be > 0");
        maxNumberTicketsPerBuyOrClaim = _maxNumber;
    }

    /**
     * @notice Set operator, treasury, and injector addresses
     * @dev Only callable by the owner
     * @param _operatorAddress address of the operator
     * @param _treasuryAddress address of the treasury
     * @param _injectorAddress address of the injector
     */
    function setOperatorAndTreasuryAndInjectorAddresses(
        address _operatorAddress,
        address _treasuryAddress,
        address _injectorAddress
    ) external onlyOwner {
        require(_operatorAddress != address(0), "Cannot be zero address");
        require(_treasuryAddress != address(0), "Cannot be zero address");
        require(_injectorAddress != address(0), "Cannot be zero address");

        operatorAddress = _operatorAddress;
        treasuryAddress = _treasuryAddress;
        injectorAddress = _injectorAddress;

        emit NewOperatorAndTreasuryAndInjectorAddresses(
            _operatorAddress,
            _treasuryAddress,
            _injectorAddress
        );
    }

    /**
     * @notice Calculate the total price of a set of tickets
     * @param _price Price per ticket (in Degis)
     * @param _amount Number of tickets to buy
     */
    function calculateTotalPriceForBulkTickets(uint256 _price, uint256 _amount)
        external
        pure
        returns (uint256)
    {
        require(_amount != 0, "number of tickets must be > 0");

        return _price * _amount;
    }

    /**
     * @notice View current lottery id
     */
    function viewCurrentLotteryId() external view returns (uint256) {
        return currentLotteryId;
    }

    /**
     * @notice View lottery information
     * @param _lotteryId: lottery id
     */
    function viewLottery(uint256 _lotteryId)
        external
        view
        returns (Lottery memory)
    {
        return _lotteries[_lotteryId];
    }

    /**
     * @notice View lottery information
     */
    function viewAllLottery() external view returns (Lottery[] memory) {
        Lottery[] memory allLottery = new Lottery[](currentLotteryId);
        for (uint256 i = 1; i <= currentLotteryId; i++) {
            allLottery[i - 1] = _lotteries[i];
        }
        return allLottery;
    }

    /**
     * @notice View ticker statuses and numbers for an array of ticket ids
     * @param _ticketIds: array of _ticketId
     */
    function viewNumbersAndStatusesForTicketIds(uint256[] calldata _ticketIds)
        external
        view
        returns (uint32[] memory, bool[] memory)
    {
        uint256 length = _ticketIds.length;
        uint32[] memory ticketNumbers = new uint32[](length);
        bool[] memory ticketStatuses = new bool[](length);

        for (uint256 i = 0; i < length; i++) {
            ticketNumbers[i] = _tickets[_ticketIds[i]].number;
            ticketStatuses[i] = _tickets[_ticketIds[i]].isRedeemed;
        }

        return (ticketNumbers, ticketStatuses);
    }

    /**
     * @notice View rewards for a given ticket, providing a bracket, and lottery id
     * @dev Computations are mostly offchain. This is used to verify a ticket!
     * @param _lotteryId: lottery round
     * @param _ticketId: ticket id
     */
    function viewRewardsForTicketId(uint256 _lotteryId, uint256 _ticketId)
        external
        view
        returns (uint256)
    {
        // Check lottery is in claimable status
        if (_lotteries[_lotteryId].status != Status.Claimable) {
            return 0;
        }

        require(
            _tickets[_ticketId].buyLotteryId <= _lotteryId,
            "ticketId is too large"
        );
        if (_tickets[_ticketId].isRedeemed == true) {
            require(
                _tickets[_ticketId].redeemLotteryId > _lotteryId,
                "ticketId was redeemed"
            );
        }
        require(
            _ticketsClaimed[_ticketId][_lotteryId] == false,
            "prize received"
        );

        // Check ticketId is within range
        if (
            (_tickets[_ticketId].buyLotteryId > _lotteryId) ||
            (_tickets[_ticketId].isRedeemed == true &&
                (_tickets[_ticketId].redeemLotteryId <= _lotteryId)) ||
            (_ticketsClaimed[_ticketId][_lotteryId] == true)
        ) {
            return 0;
        }

        return _calculateRewardsForTicketId(_lotteryId, _ticketId);
    }

    /**
     * @notice View user ticket ids, numbers, and statuses of user for a given lottery
     * @param _user: user address
     * @param _lotteryId: lottery round
     * @param _cursor: cursor to start where to retrieve the tickets
     * @param _size: the number of tickets to retrieve
     */
    // e.g. Alice, round 10, check her ticket-30 to ticket-35
    function viewUserInfoForLotteryId(
        address _user,
        uint256 _lotteryId,
        uint256 _cursor,
        uint256 _size
    )
        external
        view
        returns (
            uint256[] memory,
            uint32[] memory,
            bool[] memory,
            uint256
        )
    {
        uint256 length = _size;
        uint256 numberTicketsBoughtAtLotteryId = _userTicketIds[_user].length;

        if (length > (numberTicketsBoughtAtLotteryId - _cursor)) {
            length = numberTicketsBoughtAtLotteryId - _cursor;
        }

        uint256[] memory lotteryTicketIds = new uint256[](length);
        uint32[] memory ticketNumbers = new uint32[](length);
        bool[] memory ticketStatuses = new bool[](length);

        for (uint256 i = 0; i < length; i++) {
            lotteryTicketIds[i] = _userTicketIds[_user][i + _cursor];
            ticketNumbers[i] = _tickets[lotteryTicketIds[i]].number;
            ticketStatuses[i] = _tickets[lotteryTicketIds[i]].isRedeemed;
        }

        return (
            lotteryTicketIds,
            ticketNumbers,
            ticketStatuses,
            _cursor + length
        );
    }

    /**
     * @notice View user ticket ids, numbers, and statuses of user for a given lottery
     * @param _user: user address
     */
    // e.g. Alice, round 10, check her ticket-30 to ticket-35
    function viewUserInfo(address _user)
        external
        view
        returns (uint256[] memory, Ticket[] memory)
    {
        uint256 length = _userTicketIds[_user].length;

        uint256[] memory ticketIds = new uint256[](length);
        Ticket[] memory userTickets = new Ticket[](length);

        for (uint256 i = 0; i < length; i++) {
            ticketIds[i] = _userTicketIds[_user][i];
            userTickets[i] = _tickets[ticketIds[i]];
        }

        return (ticketIds, userTickets);
    }

    /**
     * @notice Claim all winning tickets for a lottery
     * @param _lotteryId: lottery id
     * @dev Callable by users only, not contract!
     */
    struct viewClaimAllTicketInfo {
        uint256 ticketId;
        uint256 ticketNumber;
        uint256 ticketReward;
        bool ticketClaimed;
    }

    function viewClaimAllTickets(uint256 _lotteryId)
        external
        view
        returns (
            uint256,
            uint256,
            viewClaimAllTicketInfo[] memory
        )
    {
        require(
            _lotteries[_lotteryId].status == Status.Claimable,
            "this round of lottery are not ready for claiming"
        );

        uint256 length = _userTicketIds[msg.sender].length;
        uint256 rewardToTransfer = 0;
        viewClaimAllTicketInfo[]
            memory tmpTicketInfo = new viewClaimAllTicketInfo[](length);

        uint256 num = 0;
        for (uint256 i = 0; i < _userTicketIds[msg.sender].length; i++) {
            uint256 thisTicketId = _userTicketIds[msg.sender][i];

            require(
                msg.sender == _tickets[thisTicketId].owner,
                "you are not the owner of this ticket"
            );

            if (_tickets[thisTicketId].buyLotteryId > _lotteryId) {
                continue;
            }

            if (_tickets[thisTicketId].isRedeemed == true) {
                if (_tickets[thisTicketId].redeemLotteryId <= _lotteryId) {
                    continue;
                }
            }

            if (_ticketsClaimed[thisTicketId][_lotteryId] == true) {
                continue;
            }

            uint256 rewardForTicketId = _calculateRewardsForTicketId(
                _lotteryId,
                thisTicketId
            );

            if (rewardForTicketId == 0) {
                continue;
            }

            tmpTicketInfo[num].ticketId = thisTicketId;
            tmpTicketInfo[num].ticketNumber = _tickets[thisTicketId].number;
            tmpTicketInfo[num].ticketReward = rewardForTicketId;
            tmpTicketInfo[num].ticketClaimed = _ticketsClaimed[thisTicketId][
                _lotteryId
            ];
            num += 1;

            // Increase the reward to transfer
            rewardToTransfer += rewardForTicketId;
        }

        viewClaimAllTicketInfo[]
            memory ticketInfo = new viewClaimAllTicketInfo[](num);

        for (uint256 i = 0; i < num; i++) {
            ticketInfo[i] = tmpTicketInfo[i];
        }

        return (_lotteryId, rewardToTransfer, ticketInfo);
    }

    /**
     * @notice Calculate rewards for a given ticket, in given round and given bracket
     * @param _lotteryId: lottery round
     * @param _ticketId: ticket id
     */
    function _calculateRewardsForTicketId(uint256 _lotteryId, uint256 _ticketId)
        internal
        view
        returns (uint256)
    {
        if (_tickets[_ticketId].buyLotteryId > _lotteryId) {
            return 0;
        }

        if (_tickets[_ticketId].isRedeemed == true) {
            if (_tickets[_ticketId].redeemLotteryId <= _lotteryId) {
                return 0;
            }
        }

        if (_ticketsClaimed[_ticketId][_lotteryId] == true) {
            return 0;
        }

        // Retrieve the user number combination from the ticketId
        uint32 userNumber = _tickets[_ticketId].number;

        // Retrieve the winning number combination
        uint32 winningTicketNumber = _lotteries[_lotteryId].finalNumber;

        uint32 _bracket = 5;
        for (uint32 i = 1; i <= 4; i++) {
            if (
                winningTicketNumber % (uint32(10)**i) ==
                userNumber % (uint32(10)**i)
            ) {
                _bracket = i - 1;
            }
        }

        if (_bracket == 5) {
            return 0;
        }

        // Apply transformation to verify the claim provided by the user is true
        uint32 transformedWinningNumber = _bracketCalculator[_bracket] +
            (winningTicketNumber % (uint32(10)**(_bracket + 1)));

        uint32 transformedUserNumber = _bracketCalculator[_bracket] +
            (userNumber % (uint32(10)**(_bracket + 1)));

        // Confirm that the two transformed numbers are the same
        if (transformedWinningNumber == transformedUserNumber) {
            return
                _lotteries[_lotteryId].rewardPerTicketInBracket[_bracket] *
                (int2ln(_lotteryId - _tickets[_ticketId].buyLotteryId + 1) +
                    10000);
        } else {
            return 0;
        }
    }

    /**
     * @notice Calculate all awards
     */
    function _calculateTotalAwards() internal view returns (uint256) {
        uint256 amount = 0;

        for (uint256 i = 0; i < currentLotteryId; i++) {
            amount += _lotteries[i].pendingAwards;
        }

        if (_lotteries[currentLotteryId].status == Status.Claimable) {
            amount +=
                _lotteries[currentLotteryId].pendingAwards +
                pendingInjectionNextLottery;
        } else {
            amount += _lotteries[currentLotteryId].amountCollected;
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

    
}
