// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../libraries/StringsUtils.sol";
import "../libraries/SafePRBMath.sol";
import "../utils/Ownable.sol";
import "./interfaces/IPriceGetter.sol";
import "./interfaces/INaughtyFactory.sol";
import "./interfaces/INPPolicyToken.sol";

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
 * @dev    Most of the functions to be called from outside will use the name of policyToken
 *         rather than the address (easy to read).
 *         Other variables or functions still use address to index.
 *         The rule of policyToken naming is:
 *              Original Token Name(with decimals) + Strike Price + Lower or Higher + Date
 *         E.g.  AVAX_30.0_L_2101, BTC_30000.0_L_2102, ETH_8000.0_H_2109
 *         (the original name need to be the same as in the chainlink oracle)
 */

contract PolicyCore is Ownable {
    using StringsUtils for uint256;
    using SafePRBMath for uint256;
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Variables **************************************** //
    // ---------------------------------------------------------------------------------------- //

    // Factory contract, responsible for deploying new contracts
    INaughtyFactory public factory;

    // Oracle contract, responsible for getting the final price
    IPriceGetter public priceGetter;

    // Lottery address
    address public lottery;

    // Emergency pool contract address
    address public emergencyPool;

    // Naughty Router contract address
    address public naughtyRouter;

    // Current distribution index
    uint256 public currentDistributionIndex;

    struct PolicyTokenInfo {
        address policyTokenAddress;
        bool isCall;
        uint256 decimals; // decimals of the oracle pricefeed
        uint256 strikePrice;
        uint256 deadline;
        uint256 settleTimestamp;
    }
    // Policy toke name => Policy token information
    mapping(string => PolicyTokenInfo) public policyTokenInfoMapping;

    mapping(address => string) public policyTokenAddressToName;

    // Policy token name list
    string[] public allPolicyTokens;

    // Stablecoin address => Supported or not
    mapping(address => bool) public supportedStablecoin;

    // Policy token address => Stablecoin address
    mapping(address => address) public whichStablecoin;

    // PolicyToken => Strike Token (e.g. AVAX30L202101 address => AVAX address)
    mapping(address => string) policyTokenToOriginal;

    // User Address => Token Address => User Quota Amount
    mapping(address => mapping(address => uint256)) userQuota;

    // Policy token address => All the depositors for this round
    // (store all the depositors in an array)
    mapping(address => address[]) public allDepositors;

    struct SettlementInfo {
        uint256 price;
        bool isHappened;
        bool alreadySettled;
    }
    // Policy token address => Settlement result information
    mapping(address => SettlementInfo) public settleResult;

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Events ******************************************** //
    // ---------------------------------------------------------------------------------------- //

    event LotteryChanged(address newLotteryAddress);
    event EmergencyPoolChanged(address newEmergencyPool);
    event NaughtyRouterChanged(address newRouter);

    event PolicyTokenDeployed(
        string tokenName,
        address tokenAddress,
        uint256 deadline,
        uint256 settleTimestamp
    );

    event PoolDeployed(
        address poolAddress,
        address policyTokenAddress,
        address stablecoin
    );

    event Deposit(
        address userAddress,
        string policyTokenName,
        address stablecoin,
        uint256 amount
    );

    event DelegateDeposit(
        address payerAddress,
        address userAddress,
        string policyTokenName,
        address stablecoin,
        uint256 amount
    );

    event FinalResultSettled(
        string _policyTokenName,
        uint256 price,
        bool isHappened
    );
    event NewStablecoinAdded(address _newStablecoin);

    event PolicyTokensSettledForUsers(
        string policyTokenName,
        address stablecoin,
        uint256 startIndex,
        uint256 stopIndex
    );

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Constructor, for some addresses
     * @param _usdt USDT is the first stablecoin supported in the pool
     * @param _factory Address of naughty factory
     * @param _priceGetter Address of the oracle contract
     */
    constructor(
        address _usdt,
        address _factory,
        address _priceGetter
    ) {
        // Add the first stablecoin supported
        supportedStablecoin[_usdt] = true;

        // Initialize the interfaces
        factory = INaughtyFactory(_factory);
        priceGetter = IPriceGetter(_priceGetter);
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
            "Do not support this stablecoin currently"
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
            "This policy token has not been deployed, please deploy it first"
        );
        _;
    }

    /**
     * @notice Check if there are enough stablecoins in this contract
     * @param _stablecoin Address of the stablecoin
     * @param _amount Amount to be checked
     */
    modifier enoughUSD(address _stablecoin, uint256 _amount) {
        require(
            IERC20(_stablecoin).balanceOf(address(this)) >= _amount,
            "Not sufficient stablecoins in the contract"
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
        require(
            block.timestamp <= deadline,
            "Can not deposit/redeem, has passed the deadline"
        );
        _;
    }

    /**
     * @notice Can only settle the result after the "_settleTimestamp"
     * @param _policyTokenName Name of the policy token
     */
    modifier afterSettlement(string memory _policyTokenName) {
        uint256 settleTimestamp = policyTokenInfoMapping[_policyTokenName]
            .settleTimestamp;
        require(
            block.timestamp >= settleTimestamp,
            "Can not settle/claim, have not reached settleTimestamp"
        );
        _;
    }

    /**
     * @notice Avoid multiple settlements
     * @param _policyTokenName Name of the policy token
     */
    modifier notAlreadySettled(string memory _policyTokenName) {
        address policyTokenAddress = policyTokenInfoMapping[_policyTokenName]
            .policyTokenAddress;
        require(
            settleResult[policyTokenAddress].alreadySettled == false,
            "This policy has already been settled"
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
    // Note: not really needed
    function findAddressbyName(string memory _policyTokenName)
        public
        view
        returns (address)
    {
        return policyTokenInfoMapping[_policyTokenName].policyTokenAddress;
    }

    /**
     * @notice Find the token name by its address
     * @param _policyTokenAddress Address of the policy token
     * @return policyTokenName Name of the policy token
     */
    // Note: not really needed
    function findNamebyAddress(address _policyTokenAddress)
        public
        view
        returns (string memory)
    {
        return policyTokenAddressToName[_policyTokenAddress];
    }

    /**
     * @notice Find the token information by its name
     * @param _policyTokenName Name of the policy token (e.g. "AVAX30L202103")
     * @return policyTokenInfo PolicyToken detail information
     */
    function getPolicyTokenInfo(string memory _policyTokenName)
        public
        view
        returns (PolicyTokenInfo memory)
    {
        return policyTokenInfoMapping[_policyTokenName];
    }

    /**
     * @notice Get a user's quota for a certain policy token
     * @param _user Address of the user to be checked
     * @param _policyTokenAddress Address of the policy token
     * @return _quota User's quota result
     */
    function getUserQuota(address _user, address _policyTokenAddress)
        external
        view
        returns (uint256 _quota)
    {
        _quota = userQuota[_user][_policyTokenAddress];
    }

    /**
     * @notice Get the information about all the tokens
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
     * @notice Add a newly supported stablecoin
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
        lottery = _lotteryAddress;
        emit LotteryChanged(_lotteryAddress);
    }

    /**
     * @notice Change the address of emergency pool
     * @param _emergencyPool Address of the new emergencyPool
     */
    function setEmergencyPool(address _emergencyPool) external onlyOwner {
        emergencyPool = _emergencyPool;
        emit EmergencyPoolChanged(_emergencyPool);
    }

    /**
     * @notice Change the address of naughty router
     * @param _router Address of the new naughty router
     */
    function setNaughtyRouter(address _router) external onlyOwner {
        naughtyRouter = _router;
        emit NaughtyRouterChanged(_router);
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Deploy a new policy token and return the token address
     * @dev Only the owner can deploy new policy token
     *      The name form is like "AVAX_50_L_202101" and is built inside the contract.
     * @param _tokenName Name of the original token (e.g. AVAX, BTC, ETH...)
     * @param _isCall The policy is for higher or lower than the strike price (call / put)
     * @param _decimals Decimals of this token's price (0~18)
     * @param _strikePrice Strike price of the policy (have already been transferred with 1e18)
     * @param _deadline Deadline of this policy token (deposit / redeem / swap)
     * @param _settleTimestamp Can settle after this timestamp (for oracle)
     * @return policyTokenAddress The address of the policy token just deployed
     */
    function deployPolicyToken(
        string memory _tokenName,
        bool _isCall,
        uint256 _decimals,
        uint256 _strikePrice,
        uint256 _round,
        uint256 _deadline,
        uint256 _settleTimestamp
    ) external onlyOwner returns (address) {
        require(_decimals <= 18, "Too many decimals");
        require(_deadline > block.timestamp, "Wrong deadline");

        string memory policyTokenName = _generateName(
            _tokenName,
            _decimals,
            _strikePrice,
            _isCall,
            _round
        );
        // Deploy a new policy token by the factory contract
        address policyTokenAddress = factory.deployPolicyToken(policyTokenName);

        // Store the policyToken information in the mapping
        policyTokenInfoMapping[policyTokenName] = PolicyTokenInfo(
            policyTokenAddress,
            _isCall,
            _decimals,
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
            _deadline,
            _settleTimestamp
        );

        // You can not get the return value from outside, but keep it here.
        return policyTokenAddress;
    }

    /**
     * @notice Deploy a new pair (pool)
     * @param _policyTokenName Name of the policy token
     * @param _stablecoin Address of the stable coin
     * @param _poolDeadline Swapping deadline of the pool (normally the same as the token's deadline)
     * @param _feeRate Fee rate given to LP holders
     * @return poolAddress The address of the pool just deployed
     */
    function deployPool(
        string memory _policyTokenName,
        address _stablecoin,
        uint256 _poolDeadline,
        uint256 _feeRate
    )
        external
        onlyOwner
        validStablecoin(_stablecoin)
        deployedPolicy(_policyTokenName)
        returns (address)
    {
        require(_poolDeadline > block.timestamp, "Wrong deadline");

        address policyTokenAddress = findAddressbyName(_policyTokenName);

        // Deploy a new pool (policyToken <=> stablecoin)
        address poolAddress = factory.deployPool(
            policyTokenAddress,
            _stablecoin,
            _poolDeadline,
            _feeRate
        );

        // Record the mapping
        whichStablecoin[policyTokenAddress] = _stablecoin;

        emit PoolDeployed(poolAddress, policyTokenAddress, _stablecoin);

        return poolAddress;
    }

    /**
     * @notice Deposit stablecoins and get policy tokens
     * @param _policyTokenName Name of the policy token
     * @param _stablecoin Address of the sable coin
     * @param _amount Amount of stablecoin (also the amount of policy tokens)
     */
    function deposit(
        string memory _policyTokenName,
        address _stablecoin,
        uint256 _amount
    ) external beforeDeadline(_policyTokenName) {
        address policyTokenAddress = findAddressbyName(_policyTokenName);

        // Check if the user gives the right stablecoin
        require(
            whichStablecoin[policyTokenAddress] == _stablecoin,
            "PolicyToken and stablecoin not matched"
        );

        // Check if the user has enough balance
        require(
            IERC20(_stablecoin).balanceOf(_msgSender()) >= _amount,
            "User's stablecoin balance not sufficient"
        );

        // Transfer stablecoins to this contract
        IERC20(_stablecoin).safeTransferFrom(
            _msgSender(),
            address(this),
            _amount
        );

        _mintPolicyToken(policyTokenAddress, _amount, msg.sender);

        emit Deposit(_msgSender(), _policyTokenName, _stablecoin, _amount);
    }

    /**
     * @notice Delegate deposit (deposit and mint for other addresses)
     * @dev Only called by the router contract
     * @param _policyTokenName Name of the policy token
     * @param _stablecoin Address of the sable coin
     * @param _amount Amount of stablecoin (also the amount of policy tokens)
     * @param _user Address to receive the policy tokens
     */
    function delegateDeposit(
        string memory _policyTokenName,
        address _stablecoin,
        uint256 _amount,
        address _user
    ) external beforeDeadline(_policyTokenName) {
        require(
            _msgSender() == naughtyRouter,
            "Only the router contract can delegate"
        );

        address policyTokenAddress = findAddressbyName(_policyTokenName);

        // Check if the user gives the right stablecoin
        require(
            whichStablecoin[policyTokenAddress] == _stablecoin,
            "PolicyToken and stablecoin not matched"
        );

        // Check if the user has enough balance
        require(
            IERC20(_stablecoin).balanceOf(_user) >= _amount,
            "User's stablecoin balance not sufficient"
        );

        // Transfer stablecoins to this contract
        IERC20(_stablecoin).safeTransferFrom(_user, address(this), _amount);

        _mintPolicyToken(policyTokenAddress, _amount, _user);

        emit DelegateDeposit(
            _msgSender(),
            _user,
            _policyTokenName,
            _stablecoin,
            _amount
        );
    }

    /**
     * @notice Burn policy tokens and redeem USDT
     * @dev Redeem happens before the deadline and is different from claim/settle
     * @param _policyTokenName Name of the policy token
     * @param _stablecoin Address of the stablecoin
     * @param _amount Amount of USDT (also the amount of policy tokens)
     */
    function redeem(
        string memory _policyTokenName,
        address _stablecoin,
        uint256 _amount
    ) public enoughUSD(_stablecoin, _amount) beforeDeadline(_policyTokenName) {
        address policyTokenAddress = policyTokenInfoMapping[_policyTokenName]
            .policyTokenAddress;

        // Check if the user has enough quota (quota is only for those who mint policy tokens)
        require(
            userQuota[msg.sender][policyTokenAddress] >= _amount,
            "User's quota not sufficient"
        );

        // Enough policy tokens to burn
        INPPolicyToken policyToken = INPPolicyToken(policyTokenAddress);
        require(
            policyToken.balanceOf(msg.sender) >= _amount,
            "You do not have sufficient policy tokens to redeem"
        );

        IERC20(_stablecoin).safeTransfer(msg.sender, _amount);
        policyToken.burn(_msgSender(), _amount);

        userQuota[msg.sender][policyTokenAddress] -= _amount;

        if (userQuota[msg.sender][policyTokenAddress] == 0)
            delete userQuota[msg.sender][policyTokenAddress];
    }

    /**
     * @notice Redeem policy tokens and get stablecoins by the user himeself
     * @param _policyTokenName Name of the policy token
     * @param _stablecoin Address of the stablecoin
     */
    function redeemAfterSettlement(
        string memory _policyTokenName,
        address _stablecoin
    ) public {
        address policyTokenAddress = findAddressbyName(_policyTokenName);

        // Copy to memory (will not change the result)
        SettlementInfo memory result = settleResult[policyTokenAddress];

        // Must have got the final price
        require(
            result.price != 0 && result.alreadySettled,
            "Have not got the oracle result"
        );

        // The event must be "not happend"
        require(
            result.isHappened == false,
            "Only call this function when the event does not happen"
        );

        // User must have quota because this is for depositors when event not happens
        require(
            userQuota[msg.sender][policyTokenAddress] > 0,
            "No quota, you did not deposit and mint policy tokens before"
        );

        // Charge 1% Fee when redeem / claim
        uint256 amount = userQuota[msg.sender][policyTokenAddress];
        uint256 amountWithFee = (amount * 990) / 1000;
        uint256 amountToCollect = amount - amountWithFee;

        _collectIncome(
            _stablecoin,
            (amountToCollect * 8) / 10,
            amountToCollect - (amountToCollect * 8) / 10
        );

        // Send back stablecoins directly
        IERC20(_stablecoin).safeTransfer(msg.sender, amountWithFee);

        // Delete the userQuota storage
        delete userQuota[msg.sender][policyTokenAddress];
    }

    /**
     * @notice Claim a payoff based on policy tokens
     * @dev It is done after result settlement and only if the result is true
     * @param _policyTokenName Name of the policy token
     * @param _stablecoin Address of the stable coin
     * @param _amount Amount of USDT (also the amount of policy tokens)
     */
    function claim(
        string memory _policyTokenName,
        address _stablecoin,
        uint256 _amount
    ) public enoughUSD(_stablecoin, _amount) afterSettlement(_policyTokenName) {
        address policyTokenAddress = findAddressbyName(_policyTokenName);

        // Check if we have already settle the final price
        require(
            settleResult[policyTokenAddress].alreadySettled,
            "Have not got the oracle result"
        );

        // Check if the event happens
        require(
            settleResult[policyTokenAddress].isHappened,
            "The result does not happen, you can not claim"
        );

        // Charge 1% fee
        uint256 amountWithFee = (_amount * 990) / 1000;

        // Users must have enough policy tokens to claim
        INPPolicyToken policyToken = INPPolicyToken(policyTokenAddress);
        require(
            policyToken.balanceOf(msg.sender) >= _amount,
            "You do not have sufficient policy tokens to claim"
        );

        // Burn the policy tokens and redeem payoff
        // Different amounts
        IERC20(_stablecoin).safeTransfer(msg.sender, amountWithFee);
        policyToken.burn(_msgSender(), _amount);
    }

    /**
     * @notice Get the final price from the PriceGetter contract
     * @param _policyTokenName Name of the policy token
     */
    function settleFinalResult(string memory _policyTokenName)
        public
        afterSettlement(_policyTokenName)
        notAlreadySettled(_policyTokenName)
    {
        PolicyTokenInfo memory policyTokenInfo = policyTokenInfoMapping[
            _policyTokenName
        ];

        address policyTokenAddress = policyTokenInfo.policyTokenAddress;
        require(
            policyTokenAddress != address(0),
            "This policy token does not exist, maybe you input a wrong name"
        );

        SettlementInfo storage result = settleResult[policyTokenAddress];

        // Get the final price from oracle
        string memory originalTokenName = policyTokenToOriginal[
            policyTokenAddress
        ];

        uint256 price = IPriceGetter(priceGetter).getLatestPrice(
            originalTokenName
        );

        result.price = price;

        // Get the final result
        bool situationT1 = (price >= policyTokenInfo.strikePrice) &&
            policyTokenInfo.isCall;
        bool situationT2 = (price <= policyTokenInfo.strikePrice) &&
            !policyTokenInfo.isCall;

        result.isHappened = (situationT1 || situationT2) ? true : false;

        result.alreadySettled = true;

        emit FinalResultSettled(_policyTokenName, price, result.isHappened);
    }

    /**
     * @notice Settle the policies when then insurance event do not happen
     *         Funds are automatically distributed back to the depositors
     * @dev    Take care of the gas cost and can use the _startIndex and _stopIndex to control the size
     * @param _policyTokenName Name of policy token
     * @param _stablecoin Address of stablecoin
     * @param _startIndex Settlement start index
     * @param _stopIndex Settlement stop index
     */
    function settleAllPolicyTokens(
        string memory _policyTokenName,
        address _stablecoin,
        uint256 _startIndex,
        uint256 _stopIndex
    ) public onlyOwner {
        address policyTokenAddress = findAddressbyName(_policyTokenName);

        // Copy to memory (will not change the result)
        SettlementInfo memory result = settleResult[policyTokenAddress];

        // Must have got the final price
        require(
            result.price != 0 && result.alreadySettled == true,
            "Have not got the oracle result"
        );

        // The event must be "not happend"
        require(
            result.isHappened == false,
            "Only call this function when the event does not happen"
        );

        // Store the amount to collect to lottery and emergency pool
        uint256 amountToCollect = 0;

        // Length of all depositors for this policy token
        uint256 length = allDepositors[policyTokenAddress].length;

        // Settle the policies in [_startIndex, _stopIndex)
        if (_startIndex == 0 && _stopIndex == 0) {
            amountToCollect += _settlePolicy(
                policyTokenAddress,
                _stablecoin,
                0,
                length
            );
            currentDistributionIndex = length;

            emit PolicyTokensSettledForUsers(
                _policyTokenName,
                _stablecoin,
                0,
                length
            );
        } else {
            require(
                currentDistributionIndex == _startIndex,
                "You need to start from the last distribution point"
            );
            amountToCollect += _settlePolicy(
                policyTokenAddress,
                _stablecoin,
                _startIndex,
                _stopIndex
            );
            currentDistributionIndex = _stopIndex;

            emit PolicyTokensSettledForUsers(
                _policyTokenName,
                _stablecoin,
                _startIndex,
                _stopIndex
            );
        }

        if (currentDistributionIndex == length) {
            _collectIncome(
                _stablecoin,
                (amountToCollect * 8) / 10,
                amountToCollect - (amountToCollect * 8) / 10
            );
        }
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Internal Functions ********************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Collect the income
     * @param _stablecoin Address of stable coin
     * @param _amountToLottery Fee to lottery
     * @param _amountToEmergency Fee to emergency pool
     */
    function _collectIncome(
        address _stablecoin,
        uint256 _amountToLottery,
        uint256 _amountToEmergency
    ) internal {
        require(
            lottery != address(0) && emergencyPool != address(0),
            "Please set the lottery address"
        );

        IERC20(_stablecoin).safeTransfer(lottery, _amountToLottery);
        IERC20(_stablecoin).safeTransfer(emergencyPool, _amountToEmergency);
    }

    /**
     * @notice Mint Policy Token 1:1 USD
     *         The policy token need to be deployed first!
     * @param _policyTokenAddress Address of the policy token
     * @param _amount Amount to mint
     * @param _user Address to receive the policy token
     */
    function _mintPolicyToken(
        address _policyTokenAddress,
        uint256 _amount,
        address _user
    ) internal {
        INPPolicyToken policyToken = INPPolicyToken(_policyTokenAddress);

        // Mint new policy tokens
        policyToken.mint(_user, _amount);

        // If this is the first deposit, store the user address
        if (userQuota[_user][_policyTokenAddress] == 0) {
            allDepositors[_policyTokenAddress].push(_user);
        }

        // Update the user quota
        userQuota[_user][_policyTokenAddress] += _amount;
    }

    /**
     * @notice Settle the policy when the event does not happen
     * @param _policyTokenAddress Address of policy token
     * @param _stablecoin Address of stable coin
     * @param _start Start index
     * @param _stop Stop index
     */
    function _settlePolicy(
        address _policyTokenAddress,
        address _stablecoin,
        uint256 _start,
        uint256 _stop
    ) internal returns (uint256 amountRemaining) {
        for (uint256 i = _start; i < _stop; i++) {
            address user = allDepositors[_policyTokenAddress][i];
            uint256 amount = userQuota[user][_policyTokenAddress];
            uint256 amountWithFee = (amount * 990) / 1000;

            if (amountWithFee > 0) {
                IERC20(_stablecoin).safeTransfer(user, amountWithFee);
                delete userQuota[user][_policyTokenAddress];

                amountRemaining += amount - amountWithFee;
            } else continue;
        }
    }

    /**
     * @notice Generate the policy token name
     * @param _tokenName Name of the token
     * @param _decimals Decimals of the name generation (0,1=>1)
     * @param _strikePrice Strike price of the policy
     * @param _isCall The policy's payoff is triggered when higher or lower
     * @param _round Round of the policy (e.g. 2112, 2201)
     */
    function _generateName(
        string memory _tokenName,
        uint256 _decimals,
        uint256 _strikePrice,
        bool _isCall,
        uint256 _round
    ) public pure returns (string memory) {
        string memory direction = _isCall ? "H" : "L";

        uint256 intPart = _strikePrice / 1e18;
        uint256 decimalPart = _strikePrice.frac() / (10**(18 - _decimals));

        string memory name = string(
            abi.encodePacked(
                _tokenName,
                "_",
                intPart.uintToString(),
                ".",
                decimalPart.uintToString(),
                "_",
                direction,
                "_",
                _round.uintToString()
            )
        );
        return name;
    }
}
