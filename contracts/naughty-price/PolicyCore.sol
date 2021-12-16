// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../libraries/StringsUtils.sol";

import "../utils/Ownable.sol";

import "./interfaces/IPriceGetter.sol";
import "./interfaces/INaughtyFactory.sol";

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
 *         The rule of policyToken naming is Original Token Name + Strike Price + Lower or Higher + Date
 *         E.g.  AVAX_30_L_2101, BTC_30000_L_2102, ETH_8000_H_2109
 */

contract PolicyCore is Ownable {
    using StringsUtils for uint256;
    using SafeERC20 for IERC20;

    // Factory contract, responsible for deploying new contracts
    INaughtyFactory public factory;

    // Oracle contract, responsible for getting the final price
    IPriceGetter public priceGetter;

    // Lottery address
    address public lottery;

    // Emergency pool address
    address public emergencyPool;

    // Current distribution index
    uint256 public currentDistributionIndex;

    struct PolicyTokenInfo {
        address policyTokenAddress;
        address stablecoinAddress;
        bool isCall;
        uint256 strikePrice;
        uint256 deadline;
        uint256 settleTimestamp;
    }
    // Policy toke name => Policy token information
    mapping(string => PolicyTokenInfo) policyTokenInfoMapping;

    mapping(address => string) policyTokenAddressToName;

    // Policy token name list
    string[] allPolicyTokens;

    // Stablecoin address => Supported or not
    mapping(address => bool) public supportedStablecoin;

    // PolicyToken => Strike Token (e.g. AVAX30L202101 address => AVAX address)
    mapping(address => string) policyTokenToOriginal;

    // User Address => Token Address => User Quota Amount
    mapping(address => mapping(address => uint256)) userQuota;

    // Policy token address => All the depositors for this round (store all the depositors in an array)
    mapping(address => address[]) public allDepositors;

    struct SettlementInfo {
        int256 price;
        bool isHappened;
        bool alreadySettled;
    }
    // Policy token address => Settlement result information
    mapping(address => SettlementInfo) settleResult;

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Events ******************************************** //
    // ---------------------------------------------------------------------------------------- //

    event LotteryChanged(address newLotteryAddress);
    event EmergencyPoolChanged(address newEmergencyPool);

    event FinalResultSettled(
        string _policyTokenName,
        int256 price,
        bool isHappened
    );
    event NewStablecoinAdded(address _newStablecoin);

    event FinishSettlementPolicies(
        address _policyTokenAddress,
        address _stablecoin
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
     * @param _policyTokenName Name of the policy token (e.g. "AVAX30L202103")
     * @return policyTokenAddress Address of the policy token
     */
    // FIXME: not needed
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
    // FIXME: not needed
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
     * @notice Check if this is a stablecoin address supported, used in naughtyFactory
     * @param _coinAddress Address of the stablecoin
     * @return Whether it is a supported stablecoin
     */
    // TODO:If we still need this function
    function isStablecoinAddress(address _coinAddress)
        external
        view
        returns (bool)
    {
        return supportedStablecoin[_coinAddress];
    }

    /**
     * @notice Check a user's quota for a certain policy token
     * @param _userAddress Address of the user to be checked
     * @param _policyTokenAddress Address of the policy token
     * @return _quota User's quota result
     */
    function checkUserQuota(address _userAddress, address _policyTokenAddress)
        external
        view
        returns (uint256 _quota)
    {
        _quota = userQuota[_userAddress][_policyTokenAddress];
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

    function setLottery(address _lotteryAddress) external onlyOwner {
        lottery = _lotteryAddress;
        emit LotteryChanged(_lotteryAddress);
    }

    function setEmergencyPool(address _emergencyPool) external onlyOwner {
        emergencyPool = _emergencyPool;
        emit EmergencyPoolChanged(_emergencyPool);
    }
}
