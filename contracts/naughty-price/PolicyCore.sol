// SPDX-License-Identifier: GPL-3.0-or-later

/*
 //======================================================================\\
 //======================================================================\\
    *******         **********     ***********     *****     ***********
    *      *        *              *                 *       *
    *        *      *              *                 *       *
    *         *     *              *                 *       *
    *         *     *              *                 *       *
    *         *     **********     *       *****     *       ***********
    *         *     *              *         *       *                 *
    *         *     *              *         *       *                 *
    *        *      *              *         *       *                 *
    *      *        *              *         *       *                 *
    *******         **********     ***********     *****     ***********
 \\======================================================================//
 \\======================================================================//
*/

pragma solidity ^0.8.10;
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { StringsUtils } from "../libraries/StringsUtils.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { IERC20Decimals } from "../utils/interfaces/IERC20Decimals.sol";
import { IPriceGetter } from "./interfaces/IPriceGetter.sol";
import { INaughtyFactory } from "./interfaces/INaughtyFactory.sol";
import { INPPolicyToken } from "./interfaces/INPPolicyToken.sol";

/**
 * @title  PolicyCore
 * @notice Core logic of Naughty Price Product
 *         Preset:
 *              (Done in the naughtyFactory contract)
 *              1. Deploy policyToken contract
 *              2. Deploy policyToken-Stablecoin pool contract
 *         User Interaction:
 *              1. Deposit Stablecoin and mint PolicyTokens
 *              2. Redeem their Stablecoin and burn the PolicyTokens (before settlement)
 *              3. Claim for payout with PolicyTokens (after settlement)
 *         PolicyTokens are minted with the ratio 1:1 to Stablecoin
 *         The PolicyTokens are traded in the pool with CFMM (xy=k)
 *         When the event happens, a PolicyToken can be burned for claiming 1 Stablecoin.
 *         When the event does not happen, the PolicyToken depositors can
 *         redeem their 1 deposited Stablecoin
 *
 * @dev    Most of the functions to be called from outside will use the name of policyToken
 *         rather than the address (easy to read).
 *         Other variables or functions still use address to index.
 *         The rule of policyToken naming is:
 *              Original Token Name(with decimals) + Strike Price + Lower or Higher + Date
 *         E.g.  AVAX_30.0_L_2101, BTC_30000.0_L_2102, ETH_8000.0_H_2109
 *         (the original name need to be the same as in the chainlink oracle)
 *         There are three decimals for a policy token:
 *              1. Name decimals: Only for generating the name of policyToken
 *              2. Token decimals: The decimals of the policyToken
 *                 (should be the same as the paired stablecoin)
 *              3. Price decimals: Always 18. The oracle result will be transferred for settlement
 */

contract PolicyCore is OwnableUpgradeable {
    using StringsUtils for uint256;
    using SafeERC20 for IERC20;

    uint256 internal constant SCALE = 1e18;

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Variables **************************************** //
    // ---------------------------------------------------------------------------------------- //

    // Factory contract, responsible for deploying new contracts
    INaughtyFactory public factory;

    // Oracle contract, responsible for getting the final price
    IPriceGetter public priceGetter;

    // Lottery address
    address public lottery;

    // Income sharing contract address
    address public incomeSharing;

    // Naughty Router contract address
    address public naughtyRouter;

    // Contract for initial liquidity matching
    // solhint-disable-next-line var-name-mixedcase
    address public ILMContract;

    // Income to lottery ratio (max 10)
    uint256 public toLotteryPart;

    struct PolicyTokenInfo {
        address policyTokenAddress;
        bool isCall;
        uint256 nameDecimals; // decimals of the name generation
        uint256 tokenDecimals; // decimals of the policy token
        uint256 strikePrice;
        uint256 deadline;
        uint256 settleTimestamp;
    }
    // Policy token name => Policy token information
    mapping(string => PolicyTokenInfo) public policyTokenInfoMapping;

    // Policy token address => Policy token name
    mapping(address => string) public policyTokenAddressToName;

    // Policy token name list
    string[] public allPolicyTokens;

    // Stablecoin address => Supported or not
    mapping(address => bool) public supportedStablecoin;

    // Policy token address => Stablecoin address
    mapping(address => address) public whichStablecoin;

    // PolicyToken => Strike Token (e.g. AVAX30L202101 address => AVAX address)
    mapping(address => string) internal policyTokenToOriginal;

    // User Address => Token Address => User Quota Amount
    mapping(address => mapping(address => uint256)) internal userQuota;

    struct SettlementInfo {
        uint256 price;
        bool isHappened;
        bool alreadySettled;
        uint256 currentDistributionIndex;
    }
    // Policy token address => Settlement result information
    mapping(address => SettlementInfo) public settleResult;

    // Stalecoin address => Pending income amount
    mapping(address => uint256) public pendingIncomeToLottery;
    mapping(address => uint256) public pendingIncomeToSharing;

    // IDO pool record and ido price getter contract
    mapping(string => bool) public isIDOPool;
    IPriceGetter public idoPriceGetter;

    // Arbitrary pool means the oracle is from a specific contract function
    mapping(string => bool) public isArbitraryPool;
    IPriceGetter public arbitraryPriceGetter;

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Events ******************************************** //
    // ---------------------------------------------------------------------------------------- //

    event LotteryChanged(address oldLotteryAddress, address newLotteryAddress);
    event IncomeSharingChanged(
        address oldIncomeSharing,
        address newIncomeSharing
    );
    event NaughtyRouterChanged(address oldRouter, address newRouter);
    event ILMChanged(address oldILM, address newILM);
    event IncomeToLotteryChanged(uint256 oldToLottery, uint256 newToLottery);
    event PolicyTokenDeployed(
        string tokenName,
        address tokenAddress,
        uint256 tokenDecimals,
        uint256 deadline,
        uint256 settleTimestamp
    );
    event PoolDeployed(
        address poolAddress,
        address policyTokenAddress,
        address stablecoin
    );
    event Deposit(
        address indexed userAddress,
        string indexed policyTokenName,
        address indexed stablecoin,
        uint256 amount
    );
    event DelegateDeposit(
        address payerAddress,
        address userAddress,
        string policyTokenName,
        address stablecoin,
        uint256 amount
    );
    event Redeem(
        address indexed userAddress,
        string indexed policyTokenName,
        address indexed stablecoin,
        uint256 amount
    );
    event RedeemAfterSettlement(
        address indexed userAddress,
        string indexed policyTokenName,
        address indexed stablecoin,
        uint256 amount
    );
    event FinalResultSettled(
        string _policyTokenName,
        uint256 price,
        bool isHappened
    );
    event NewStablecoinAdded(address _newStablecoin);
    event UpdateUserQuota(
        address user,
        address policyTokenAddress,
        uint256 amount
    );
    event IDOPriceGetterChanged(address oldPriceGetter, address newPriceGetter);
    event ArbitraryPriceGetterChanged(
        address oldArbitraryPriceGetter,
        address newArbitraryPriceGetter
    );

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Constructor, for some addresses
     *
     * @param _factory     Address of naughty factory
     * @param _priceGetter Address of the oracle contract
     */
    function initialize(
        address _factory,
        address _priceGetter
    ) public initializer {
        __Ownable_init();

        factory = INaughtyFactory(_factory);
        priceGetter = IPriceGetter(_priceGetter);

        // 20% to lottery, 80% to income sharing
        toLotteryPart = 2;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************** Modifiers *************************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Check if this stablecoin is supported
     * @param _stablecoin Stablecoin address
     */
    modifier validStablecoin(address _stablecoin) {
        require(
            supportedStablecoin[_stablecoin] == true,
            "Stablecoin not support"
        );
        _;
    }

    /**
     * @notice Check whether the policy token is paired with this stablecoin
     * @param _policyTokenName Policy token name
     * @param _stablecoin      Stablecoin address
     */
    modifier validPolicyTokenWithStablecoin(
        string memory _policyTokenName,
        address _stablecoin
    ) {
        address policyTokenAddress = findAddressbyName(_policyTokenName);
        require(
            whichStablecoin[policyTokenAddress] == _stablecoin,
            "Invalid policytoken&stablecoin"
        );
        _;
    }

    /**
     * @notice Check if the policy token has been deployed, used when deploying pools
     * @param _policyTokenName Name of the policy token inside the pair
     */
    modifier deployedPolicy(string memory _policyTokenName) {
        require(
            policyTokenInfoMapping[_policyTokenName].policyTokenAddress !=
                address(0),
            "Policytoken not deployed"
        );
        _;
    }

    /**
     * @notice Deposit/Redeem/Swap only before deadline
     * @dev Each pool will also have this deadline
     *      That needs to be set inside naughtyFactory
     * @param _policyTokenName Name of the policy token
     */
    modifier beforeDeadline(string memory _policyTokenName) {
        uint256 deadline = policyTokenInfoMapping[_policyTokenName].deadline;
        require(block.timestamp <= deadline, "Deadline passed");
        _;
    }

    /**
     * @notice Can only settle the result after the "_settleTimestamp"
     * @param _policyTokenName Name of the policy token
     */
    modifier afterSettlement(string memory _policyTokenName) {
        uint256 settleTimestamp = policyTokenInfoMapping[_policyTokenName]
            .settleTimestamp;
        require(block.timestamp >= settleTimestamp, "Not reach settle time");
        _;
    }

    /**
     * @notice Avoid multiple settlements
     * @param _policyTokenName Name of the policy token
     */
    modifier notAlreadySettled(string memory _policyTokenName) {
        address policyTokenAddress = findAddressbyName(_policyTokenName);
        require(
            settleResult[policyTokenAddress].alreadySettled == false,
            "Already settled"
        );
        _;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ View Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Find the token address by its name
     * @param _policyTokenName Name of the policy token (e.g. "AVAX_30_L_2103")
     * @return policyTokenAddress Address of the policy token
     */
    function findAddressbyName(
        string memory _policyTokenName
    ) public view returns (address policyTokenAddress) {
        policyTokenAddress = policyTokenInfoMapping[_policyTokenName]
            .policyTokenAddress;

        require(policyTokenAddress != address(0), "Policy token not found");
    }

    /**
     * @notice Find the token name by its address
     * @param _policyTokenAddress Address of the policy token
     * @return policyTokenName Name of the policy token
     */
    function findNamebyAddress(
        address _policyTokenAddress
    ) public view returns (string memory policyTokenName) {
        policyTokenName = policyTokenAddressToName[_policyTokenAddress];

        require(bytes(policyTokenName).length > 0, "Policy name not found");
    }

    /**
     * @notice Find the token information by its name
     * @param _policyTokenName Name of the policy token (e.g. "AVAX30L202103")
     * @return policyTokenInfo PolicyToken detail information
     */
    function getPolicyTokenInfo(
        string memory _policyTokenName
    ) public view returns (PolicyTokenInfo memory) {
        return policyTokenInfoMapping[_policyTokenName];
    }

    /**
     * @notice Get a user's quota for a certain policy token
     * @param _user               Address of the user to be checked
     * @param _policyTokenAddress Address of the policy token
     * @return _quota User's quota result
     */
    function getUserQuota(
        address _user,
        address _policyTokenAddress
    ) external view returns (uint256 _quota) {
        _quota = userQuota[_user][_policyTokenAddress];
    }

    /**
     * @notice Get the information about all the tokens
     * @dev Include all active&expired tokens
     * @return tokensInfo Token information list
     */
    function getAllTokens() external view returns (PolicyTokenInfo[] memory) {
        uint256 length = allPolicyTokens.length;
        PolicyTokenInfo[] memory tokensInfo = new PolicyTokenInfo[](length);

        for (uint256 i = 0; i < length; i++) {
            tokensInfo[i] = policyTokenInfoMapping[allPolicyTokens[i]];
        }

        return tokensInfo;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Set Functions ************************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Add a new supported stablecoin
     * @param _newStablecoin Address of the new stablecoin
     */
    function addStablecoin(address _newStablecoin) external onlyOwner {
        supportedStablecoin[_newStablecoin] = true;
        emit NewStablecoinAdded(_newStablecoin);
    }

    /**
     * @notice Change the address of lottery
     * @param _lotteryAddress Address of the new lottery
     */
    function setLottery(address _lotteryAddress) external onlyOwner {
        emit LotteryChanged(lottery, _lotteryAddress);
        lottery = _lotteryAddress;
    }

    /**
     * @notice Change the address of emergency pool
     * @param _incomeSharing Address of the new incomeSharing
     */
    function setIncomeSharing(address _incomeSharing) external onlyOwner {
        emit IncomeSharingChanged(incomeSharing, _incomeSharing);
        incomeSharing = _incomeSharing;
    }

    /**
     * @notice Change the address of naughty router
     * @param _router Address of the new naughty router
     */
    function setNaughtyRouter(address _router) external onlyOwner {
        emit NaughtyRouterChanged(naughtyRouter, _router);
        naughtyRouter = _router;
    }

    /**
     * @notice Change the address of ILM
     * @param _ILM Address of the new ILM
     */
    function setILMContract(address _ILM) external onlyOwner {
        emit ILMChanged(ILMContract, _ILM);
        ILMContract = _ILM;
    }

    /**
     * @notice Change the income part to lottery
     * @dev The remaining part will be distributed to incomeSharing
     * @param _toLottery Proportion to lottery
     */
    function setIncomeToLottery(uint256 _toLottery) external onlyOwner {
        require(_toLottery <= 10, "Max 10");
        emit IncomeToLotteryChanged(toLotteryPart, _toLottery);
        toLotteryPart = _toLottery;
    }

    /**
     * @notice Set IDO price getter contract
     * @param _idoPriceGetter Address of the new IDO price getter contract
     */
    function setIDOPriceGetter(address _idoPriceGetter) external onlyOwner {
        emit IDOPriceGetterChanged(address(idoPriceGetter), _idoPriceGetter);
        idoPriceGetter = IPriceGetter(_idoPriceGetter);
    }

    function setArbitraryPriceGetter(
        address _arbitraryPriceGetter
    ) external onlyOwner {
        emit ArbitraryPriceGetterChanged(
            address(arbitraryPriceGetter),
            _arbitraryPriceGetter
        );
        arbitraryPriceGetter = IPriceGetter(_arbitraryPriceGetter);
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Deploy a new policy token and return the token address.
     * @dev Only the owner can deploy new policy tokens.
     *      The name form is like "Token_Price_Direction_Date" ("AVAX_50_L_2203") and is built inside the contract.
     *      Name decimals and token decimals are different here.
     *
     *      Token decimals = Stablecoin decimals
     *
     *      For normal tokens: The original token name should be the same in Chainlink PriceFeeds.
     *                         Those tokens that are not listed on Chainlink are not supported.
     *      For DEX tokens:    The original token should have a valid DEX pair and be manually set in IDOPriceGetter.
     *      For arbitrary tokens: The original token's price source should be manually set in ArbitraryPriceGetter.
     *
     * @param _tokenName       Name of the original token (e.g. AVAX, BTC, ETH...)
     * @param _stablecoin      Address of the stablecoin (check decimals here, should be the same stablecoin when deploying pools)
     * @param _isCall          The policy is for higher or lower than the strike price (call / put)
     * @param _nameDecimals    Decimals of this token's name (0~18)
     * @param _tokenDecimals   Decimals of this token's value (0~18) (same as paired stablecoin)
     * @param _strikePrice     Strike price of the policy (have already been transferred with 1e18)
     * @param _round           Round of the token (e.g. 2203 -> expired at 22 March)
     * @param _deadline        Deadline of this policy token (deposit / redeem / swap)
     * @param _settleTimestamp Can settle after this timestamp (for oracle)
     * @param _poolType        _poolType: 0 normal 1 IDO 2 arbitrary
     */
    function deployPolicyToken(
        string memory _tokenName,
        address _stablecoin,
        bool _isCall,
        uint256 _nameDecimals,
        uint256 _tokenDecimals,
        uint256 _strikePrice,
        string memory _round,
        uint256 _deadline,
        uint256 _settleTimestamp,
        uint256 _poolType
    ) external onlyOwner {
        require(
            _nameDecimals <= 18 && _tokenDecimals <= 18,
            "Too many decimals"
        );
        require(
            IERC20Decimals(_stablecoin).decimals() == _tokenDecimals,
            "Decimals not paired"
        );

        require(_deadline > block.timestamp, "Wrong deadline");
        require(_settleTimestamp >= _deadline, "Wrong settleTimestamp");

        // Generate the policy token name
        string memory policyTokenName = _generateName(
            _tokenName,
            _nameDecimals,
            _strikePrice,
            _isCall,
            _round
        );
        // Deploy a new policy token by the factory contract
        address policyTokenAddress = factory.deployPolicyToken(
            policyTokenName,
            _tokenDecimals
        );

        // Store the policyToken information in the mapping
        policyTokenInfoMapping[policyTokenName] = PolicyTokenInfo(
            policyTokenAddress,
            _isCall,
            _nameDecimals,
            _tokenDecimals,
            _strikePrice,
            _deadline,
            _settleTimestamp
        );

        // Keep the record from policy token to original token
        policyTokenToOriginal[policyTokenAddress] = _tokenName;

        // Record the address to name mapping
        policyTokenAddressToName[policyTokenAddress] = policyTokenName;

        // Push the policytokenName into the list
        allPolicyTokens.push(policyTokenName);

        emit PolicyTokenDeployed(
            policyTokenName,
            policyTokenAddress,
            _tokenDecimals,
            _deadline,
            _settleTimestamp
        );

        // Record if it is a IDO pool or arbitrary pool
        if (_poolType == 1) {
            isIDOPool[policyTokenName] = true;
        } else if (_poolType == 2) {
            isArbitraryPool[policyTokenName] = true;
        }
    }

    /**
     * @notice Deploy a new pair (pool).
     *         The policy token should be already deployed.
     *         Caller can be the owner or ILM contract.
     *
     * @param _policyTokenName Name of the policy token.
     * @param _stablecoin      Address of the stable coin.
     * @param _poolDeadline    Swapping deadline of the pool (normally the same as the token's deadline).
     * @param _feeRate         Fee rate given to LP holders.
     */
    function deployPool(
        string memory _policyTokenName,
        address _stablecoin,
        uint256 _poolDeadline,
        uint256 _feeRate
    )
        external
        validStablecoin(_stablecoin)
        deployedPolicy(_policyTokenName)
        returns (address)
    {
        require(
            msg.sender == owner() || msg.sender == ILMContract,
            "Only owner or ILM"
        );

        require(_poolDeadline > block.timestamp, "Wrong deadline");
        require(
            _poolDeadline == policyTokenInfoMapping[_policyTokenName].deadline,
            "Different deadline"
        );
        address policyTokenAddress = findAddressbyName(_policyTokenName);

        address poolAddress = _deployPool(
            policyTokenAddress,
            _stablecoin,
            _poolDeadline,
            _feeRate
        );

        emit PoolDeployed(poolAddress, policyTokenAddress, _stablecoin);

        return poolAddress;
    }

    /**
     * @notice Deposit stablecoins and get policy tokens
     * @param _policyTokenName Name of the policy token
     * @param _stablecoin      Address of the stable coin
     * @param _amount          Amount of stablecoin
     */
    function deposit(
        string memory _policyTokenName,
        address _stablecoin,
        uint256 _amount
    )
        public
        beforeDeadline(_policyTokenName)
        validPolicyTokenWithStablecoin(_policyTokenName, _stablecoin)
    {
        require(_amount > 0, "Zero Amount");
        _deposit(_policyTokenName, _stablecoin, _amount, msg.sender);
    }

    /**
     * @notice Delegate deposit (deposit and mint for other addresses)
     * @dev Only called by the router contract
     *
     * @param _policyTokenName Name of the policy token
     * @param _stablecoin      Address of the sable coin
     * @param _amount          Amount of stablecoin
     * @param _user            Address to receive the policy tokens
     */
    function delegateDeposit(
        string memory _policyTokenName,
        address _stablecoin,
        uint256 _amount,
        address _user
    )
        external
        beforeDeadline(_policyTokenName)
        validPolicyTokenWithStablecoin(_policyTokenName, _stablecoin)
    {
        require(msg.sender == naughtyRouter, "Only router can delegate");
        require(_amount > 0, "Zero Amount");

        _deposit(_policyTokenName, _stablecoin, _amount, _user);

        emit DelegateDeposit(
            msg.sender,
            _user,
            _policyTokenName,
            _stablecoin,
            _amount
        );
    }

    /**
     * @notice Burn policy tokens and redeem stablecoins
     * @dev Redeem happens before the deadline and is different from claim/settle
     * @param _policyTokenName Name of the policy token
     * @param _stablecoin      Address of the stablecoin
     * @param _amount          Amount to redeem
     */
    function redeem(
        string memory _policyTokenName,
        address _stablecoin,
        uint256 _amount
    )
        public
        beforeDeadline(_policyTokenName)
        validPolicyTokenWithStablecoin(_policyTokenName, _stablecoin)
    {
        address policyTokenAddress = findAddressbyName(_policyTokenName);

        // Check if the user has enough quota (quota is only for those who mint policy tokens)
        require(
            userQuota[msg.sender][policyTokenAddress] >= _amount,
            "User's quota not sufficient"
        );

        // Update quota
        userQuota[msg.sender][policyTokenAddress] -= _amount;

        // Charge 1% Fee when redeem / claim
        uint256 amountWithFee = _chargeFee(_stablecoin, _amount);

        // Transfer back the stablecoin
        IERC20(_stablecoin).safeTransfer(msg.sender, amountWithFee);

        // Burn the policy tokens
        INPPolicyToken policyToken = INPPolicyToken(policyTokenAddress);
        policyToken.burn(msg.sender, _amount);

        emit Redeem(msg.sender, _policyTokenName, _stablecoin, _amount);
    }

    /**
     * @notice Redeem policy tokens and get stablecoins by the user himeself
     * @param _policyTokenName Name of the policy token
     * @param _stablecoin      Address of the stablecoin
     */
    function redeemAfterSettlement(
        string memory _policyTokenName,
        address _stablecoin
    )
        public
        afterSettlement(_policyTokenName)
        validPolicyTokenWithStablecoin(_policyTokenName, _stablecoin)
    {
        address policyTokenAddress = findAddressbyName(_policyTokenName);

        // Copy to memory (will not change the result)
        SettlementInfo memory result = settleResult[policyTokenAddress];

        // Must have got the final price
        require(
            result.price != 0 && result.alreadySettled,
            "Have not got the oracle result"
        );

        require(result.isHappened == false, "Event must not happen");

        uint256 quota = userQuota[msg.sender][policyTokenAddress];
        // User must have quota because this is for depositors when event not happens
        require(quota > 0, "No quota");

        // Charge 1% Fee when redeem / claim
        uint256 amountWithFee = _chargeFee(_stablecoin, quota);

        // Send back stablecoins directly
        IERC20(_stablecoin).safeTransfer(msg.sender, amountWithFee);

        // Delete the userQuota storage
        delete userQuota[msg.sender][policyTokenAddress];

        emit RedeemAfterSettlement(
            msg.sender,
            _policyTokenName,
            _stablecoin,
            amountWithFee
        );
    }

    /**
     * @notice Claim a payoff based on policy tokens
     * @dev It is done after result settlement and only if the result is true
     * @param _policyTokenName Name of the policy token
     * @param _stablecoin      Address of the stable coin
     * @param _amount          Amount of stablecoin
     */
    function claim(
        string memory _policyTokenName,
        address _stablecoin,
        uint256 _amount
    )
        public
        afterSettlement(_policyTokenName)
        validPolicyTokenWithStablecoin(_policyTokenName, _stablecoin)
    {
        address policyTokenAddress = findAddressbyName(_policyTokenName);

        // Copy to memory (will not change the result)
        SettlementInfo memory result = settleResult[policyTokenAddress];

        // Check if we have already settle the final price
        require(
            result.price != 0 && result.alreadySettled,
            "Have not got the oracle result"
        );

        // Check if the event happens
        require(result.isHappened, "Event must happen");

        // Charge 1% fee
        uint256 amountWithFee = _chargeFee(_stablecoin, _amount);

        IERC20(_stablecoin).safeTransfer(msg.sender, amountWithFee);

        // Users must have enough policy tokens to claim
        INPPolicyToken policyToken = INPPolicyToken(policyTokenAddress);

        // Burn the policy tokens
        policyToken.burn(msg.sender, _amount);
    }

    /**
     * @notice Get the final price from the PriceGetter contract
     * @param _policyTokenName Name of the policy token
     */
    function settleFinalResult(
        string memory _policyTokenName
    )
        public
        afterSettlement(_policyTokenName)
        notAlreadySettled(_policyTokenName)
    {
        address policyTokenAddress = findAddressbyName(_policyTokenName);

        SettlementInfo storage result = settleResult[policyTokenAddress];

        // Get the strike token name
        string memory originalTokenName = policyTokenToOriginal[
            policyTokenAddress
        ];

        uint256 finalPrice;
        // Get the final price from oracle
        if (isIDOPool[_policyTokenName]) {
            finalPrice = idoPriceGetter.getLatestPrice(_policyTokenName);
        } else if (isArbitraryPool[_policyTokenName]) {
            finalPrice = arbitraryPriceGetter.getLatestPrice(_policyTokenName);
        } else {
            finalPrice = priceGetter.getLatestPrice(originalTokenName);
        }

        // Record the price
        result.alreadySettled = true;
        result.price = finalPrice;

        PolicyTokenInfo memory policyTokenInfo = policyTokenInfoMapping[
            _policyTokenName
        ];

        // Get the final result
        bool situationT1 = (finalPrice >= policyTokenInfo.strikePrice) &&
            policyTokenInfo.isCall;
        bool situationT2 = (finalPrice <= policyTokenInfo.strikePrice) &&
            !policyTokenInfo.isCall;

        bool isHappened = (situationT1 || situationT2) ? true : false;

        // Record the result
        result.isHappened = isHappened;

        emit FinalResultSettled(_policyTokenName, finalPrice, isHappened);
    }

    /**
     * @notice Collect the income
     * @dev Can be done by anyone, only when there is some income to be distributed
     *      For each stablecoin, this function need to called separately
     *
     * @param _stablecoin Address of stablecoin
     */
    function collectIncome(address _stablecoin) public {
        require(
            lottery != address(0) && incomeSharing != address(0),
            "Not set lottery/incomeSharing"
        );

        uint256 amountToLottery = pendingIncomeToLottery[_stablecoin];
        uint256 amountToSharing = pendingIncomeToSharing[_stablecoin];
        require(
            amountToLottery > 0 || amountToSharing > 0,
            "No pending income"
        );

        IERC20(_stablecoin).safeTransfer(lottery, amountToLottery);
        IERC20(_stablecoin).safeTransfer(incomeSharing, amountToSharing);

        pendingIncomeToLottery[_stablecoin] = 0;
        pendingIncomeToSharing[_stablecoin] = 0;
    }

    /**
     * @notice Update user quota from ILM when claim
     *
     * @dev When you claim your liquidity from ILM, you will get normal quota as you are using policyCore
     * @param _user        User address
     * @param _policyToken PolicyToken address
     * @param _amount      Quota amount
     */
    function updateUserQuota(
        address _user,
        address _policyToken,
        uint256 _amount
    ) external {
        require(msg.sender == ILMContract, "Only ILM");

        userQuota[_user][_policyToken] += _amount;

        emit UpdateUserQuota(_user, _policyToken, _amount);
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Internal Functions ********************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Finish deploying a pool
     *
     * @param _policyTokenAddress Address of the policy token
     * @param _stablecoin         Address of the stable coin
     * @param _poolDeadline       Swapping deadline of the pool (normally the same as the token's deadline)
     * @param _feeRate            Fee rate given to LP holders
     *
     * @return poolAddress Address of the pool
     */
    function _deployPool(
        address _policyTokenAddress,
        address _stablecoin,
        uint256 _poolDeadline,
        uint256 _feeRate
    ) internal returns (address) {
        // Deploy a new pool (policyToken <=> stablecoin)
        address poolAddress = factory.deployPool(
            _policyTokenAddress,
            _stablecoin,
            _poolDeadline,
            _feeRate
        );

        // Record the mapping
        whichStablecoin[_policyTokenAddress] = _stablecoin;

        return poolAddress;
    }

    /**
     * @notice Finish Deposit
     *
     * @param _policyTokenName Name of the policy token
     * @param _stablecoin Address of the sable coin
     * @param _amount Amount of stablecoin
     * @param _user Address to receive the policy tokens
     */
    function _deposit(
        string memory _policyTokenName,
        address _stablecoin,
        uint256 _amount,
        address _user
    ) internal {
        address policyTokenAddress = findAddressbyName(_policyTokenName);

        // Update the user quota
        userQuota[_user][policyTokenAddress] += _amount;

        // Transfer stablecoins to this contract
        IERC20(_stablecoin).safeTransferFrom(_user, address(this), _amount);

        INPPolicyToken policyToken = INPPolicyToken(policyTokenAddress);

        // Mint new policy tokens
        policyToken.mint(_user, _amount);

        emit Deposit(_user, _policyTokenName, _stablecoin, _amount);
    }

    /**
     * @notice Charge fee when redeem / claim
     *
     * @param _stablecoin Stablecoin address
     * @param _amount     Amount to redeem / claim
     *
     * @return amountWithFee Amount with fee
     */
    function _chargeFee(
        address _stablecoin,
        uint256 _amount
    ) internal returns (uint256) {
        uint256 amountWithFee = (_amount * 990) / 1000;
        uint256 amountToCollect = _amount - amountWithFee;

        uint256 amountToLottery = (amountToCollect * toLotteryPart) / 10;

        pendingIncomeToLottery[_stablecoin] += amountToLottery;
        pendingIncomeToSharing[_stablecoin] +=
            amountToCollect -
            amountToLottery;

        return amountWithFee;
    }

    /**
     * @notice Generate the policy token name
     *
     * @param _tokenName   Name of the stike token (BTC, ETH, AVAX...)
     * @param _decimals    Decimals of the name generation (0,1=>1, 2=>2)
     * @param _strikePrice Strike price of the policy (18 decimals)
     * @param _isCall      The policy's payoff is triggered when higher(true) or lower(false)
     * @param _round       Round of the policy, named by <month><day> (e.g. 0320, 1215)
     */
    function _generateName(
        string memory _tokenName,
        uint256 _decimals,
        uint256 _strikePrice,
        bool _isCall,
        string memory _round
    ) public pure returns (string memory) {
        // The direction is "H"(Call) or "L"(Put)
        string memory direction = _isCall ? "H" : "L";

        // Integer part of the strike price (12e18 => 12)
        uint256 intPart = _strikePrice / 1e18;
        // require(intPart > 0, "Invalid int part");

        uint256 decimalPart;
        string memory decimalPartString;

        // Decimal part of the strike price (1234e16 => 34)
        // Can not start with 0 (e.g. 1204e16 => 0 this is incorrect, will revert in next step)
        uint256 modRemaining = _frac(_strikePrice);

        decimalPart = modRemaining / (10 ** (18 - _decimals));

        if (decimalPart < 10 ** (_decimals - 1)) {
            decimalPartString = string(
                abi.encodePacked(
                    _returnZeroes(_findZeroes(modRemaining, _decimals)),
                    decimalPart.uintToString()
                )
            );
        } else {
            decimalPartString = decimalPart.uintToString();
        }

        // if (_decimals >= 2)
        //     require(decimalPart > 10**(_decimals - 1), "Invalid decimal part");

        // Combine the string
        string memory name = string(
            abi.encodePacked(
                _tokenName,
                "_",
                intPart.uintToString(),
                ".",
                decimalPartString,
                "_",
                direction,
                "_",
                _round
            )
        );
        return name;
    }

    /**
     * @notice Calculate the fraction part of a number
     *
     * @dev The scale is fixed as 1e18 (decimal fraction)
     *
     * @param x Number to calculate
     *
     * @return result Fraction result
     */
    function _frac(uint256 x) internal pure returns (uint256 result) {
        assembly {
            result := mod(x, SCALE)
        }
    }

    // E.g. number = 12.0456 e18 = 1204 e16
    //      x = modRemaining = 456 e14
    //      decimals = 4
    //      Should return: 1
    function _findZeroes(
        uint256 x,
        uint256 decimals
    ) internal pure returns (uint256 numOfZero) {
        assert(decimals <= 16);
        numOfZero = 1;

        uint256 fracRes;

        for (uint256 i; i < decimals; ) {
            fracRes = x / 10 ** (16 - i);
            if (fracRes == 0) {
                numOfZero++;
            } else {
                break;
            }

            unchecked {
                ++i;
            }
        }
    }

    function _returnZeroes(
        uint256 num
    ) public pure returns (string memory zeroString) {
        for (uint256 i; i < num; ) {
            zeroString = string(abi.encodePacked(zeroString, "0"));

            unchecked {
                ++i;
            }
        }
    }
}
