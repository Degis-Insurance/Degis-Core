// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";

import "../utils/Ownable.sol";

import "../tokens/interfaces/IBuyerToken.sol";
import "./interfaces/ISigManager.sol";

import "./PolicyParameters.sol";

contract PolicyFlow is ChainlinkClient, PolicyParameters, Ownable {
    using Chainlink for Chainlink.Request;

    // Other contracts
    IBuyerToken buyerToken;
    ISigManager sigManager;

    string public FLIGHT_STATUS_URL =
        "https://18.163.254.50:3207/flight_status?";

    uint256 public totalPolicies;

    uint256 public fee;

    enum PolicyStatus {
        INI,
        SOLD,
        DECLINED,
        EXPIRED,
        CLAIMED
    }

    struct PolicyInfo {
        uint256 productId;
        address buyerAddress;
        uint256 policyId;
        string flightNumber;
        uint256 premium;
        uint256 payoff;
        uint256 purchaseTimestamp;
        uint256 departureTimestamp;
        uint256 landingTimestamp;
        PolicyStatus status;
        bool alreadySettled;
        uint256 delayResult;
    }
    mapping(uint256 => PolicyInfo) public policyList;

    mapping(address => uint256[]) userPolicyList;

    mapping(uint256 => uint256) delayResultList;

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //
    constructor(
        address _insurancePool,
        address _policyToken,
        address _sigManager,
        address _buyerToken
    ) {
        sigManager = ISigManager(_sigManager);
        buyerToken = IBuyerToken(_buyerToken);
    }

    // ----------------------------------------------------------------------------------- //
    // ************************************ Modifiers ************************************ //
    // ----------------------------------------------------------------------------------- //

    /**
     * @dev This modifier uses assert which means this error should never happens.
     */
    modifier validAddress() {
        assert(msg.sender != address(0));
        _;
    }

    // ----------------------------------------------------------------------------------- //
    // ********************************* View Functions ********************************** //
    // ----------------------------------------------------------------------------------- //

    /**
     * @notice Returns the address of the LINK token
     * @dev This is the public implementation for chainlinkTokenAddress, which is
     *      an internal method of the ChainlinkClient contract
     */
    function getChainlinkTokenAddress() external view returns (address) {
        return chainlinkTokenAddress();
    }

    /**
     * @notice Show a user's policies (all)
     * @param _userAddress User's address
     * @return userPolicies User's all policy details
     */
    function viewUserPolicy(address _userAddress)
        external
        view
        returns (PolicyInfo[] memory)
    {
        uint256 userPolicyAmount = userPolicyList[_userAddress].length;
        require(userPolicyAmount > 0, "No policy for this user");

        PolicyInfo[] memory result = new PolicyInfo[](userPolicyAmount);

        for (uint256 i = 0; i < userPolicyAmount; i++) {
            uint256 policyId = userPolicyList[_userAddress][i];

            result[i] = policyList[policyId];
        }
        return result;
    }

    /**
     * @notice Get the policyInfo from its count/order
     * @param _policyId Total count/order of the policy = NFT tokenId
     * @return policy A struct of information about this policy
     */
    // TODO: If still need this function
    function getPolicyInfoById(uint256 _policyId)
        public
        view
        returns (PolicyInfo memory policy)
    {
        policy = policyList[_policyId];
    }

    /**
     * @notice Get the policy buyer by policyId
     * @param _policyId Unique policy Id (uint256)
     * @return buyerAddress The buyer of this policy
     */
    // TODO: If still need this function
    function findPolicyBuyerById(uint256 _policyId)
        public
        view
        returns (address buyerAddress)
    {
        buyerAddress = policyList[_policyId].buyerAddress;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Set Functions ************************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Change the oracle fee
     * @param _fee New oracle fee
     */
    function changeFee(uint256 _fee) external onlyOwner {
        fee = _fee;
    }

    /**
     * @notice Change the max payoff
     * @param _newMaxPayoff New maxpayoff amount
     */
    function changeMaxPayoff(uint256 _newMaxPayoff) external onlyOwner {
        MAX_PAYOFF = _newMaxPayoff;
    }

    /**
     * @notice How long before departure when users can not buy new policies
     * @param _newMinTime New time set
     */
    function changeMinTimeBeforeDeparture(uint256 _newMinTime)
        external
        onlyOwner
    {
        MIN_TIME_BEFORE_DEPARTURE = _newMinTime;
    }

    /**
     * @notice Change the oracle address
     * @param _oracleAddress New oracle address
     */
    // function setFlightOracle(address _oracleAddress) external onlyOwner {
    //     flightOracle = IFlightOracle(_oracleAddress);
    // }

    /**
     * @notice Set a new url
     */
    function setURL(string memory _url) external onlyOwner {
        FLIGHT_STATUS_URL = _url;
    }

    /**
     * @notice Set the new delay threshold used for calculating payoff
     * @param _thresholdMin New minimum threshold
     * @param _thresholdMax New maximum threshold
     */
    function setDelayThreshold(uint256 _thresholdMin, uint256 _thresholdMax)
        external
        onlyOwner
    {
        DELAY_THRESHOLD_MIN = _thresholdMin;
        DELAY_THRESHOLD_MAX = _thresholdMax;
        emit DelayThresholdSet(_thresholdMin, _thresholdMax);
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Buy a new flight delay policy
     * @dev The transaction should have the signature from the backend server
     * @param _productId ID of the purchased product (0: flightdelay; 1,2,3...: others)
     * @param _flightNumber Flight number in string (e.g. "AQ1299")
     * @param _premium Premium of this policy (decimals: 18)
     * @param _departureTimestamp Departure date of this flight (unix timestamp in s, not ms!)
     * @param _landingDate Landing date of this flight (uinx timestamp in s, not ms!)
     * @param _deadline Deadline for this purchase request
     * @param signature Use web3.eth.sign(hash(data), account) to generate the signature
     */
    function newApplication(
        uint256 _productId,
        string memory _flightNumber,
        uint256 _premium,
        uint256 _departureTimestamp,
        uint256 _landingDate,
        uint256 _deadline,
        bytes calldata signature
    ) public returns (uint256 _policyId) {
        require(
            block.timestamp <= _deadline,
            "Expired deadline, please resubmit a transaction"
        );

        require(
            _productId == PRODUCT_ID,
            "You are calling the wrong product contract"
        );

        require(
            _departureTimestamp >= block.timestamp + MIN_TIME_BEFORE_DEPARTURE,
            "It's too close to the departure time, you cannot buy this policy"
        );

        // Should be signed by operators
        // _checkSignature(
        //     signature,
        //     _flightNumber,
        //     msg.sender,
        //     _premium,
        //     _deadline
        // );

        // Generate the policy
        uint256 currentPolicyId = totalPolicies;
        policyList[currentPolicyId] = PolicyInfo(
            PRODUCT_ID,
            msg.sender,
            currentPolicyId,
            _flightNumber,
            _premium,
            MAX_PAYOFF,
            block.timestamp,
            _departureTimestamp,
            _landingDate,
            PolicyStatus.INI,
            false,
            404
        );

        // Check the policy with the insurance pool status
        // May be accepted or rejected, if accepted then update the status of insurancePool
        // _policyCheck(_premium, MAX_PAYOFF, msg.sender, currentPolicyId);

        // Give buyer tokens depending on the usd value they spent
        buyerToken.mintBuyerToken(msg.sender, _premium);

        // Store the policy's total order with userAddress
        userPolicyList[msg.sender].push(totalPolicies);

        // Update total policies
        totalPolicies += 1;

        emit newPolicyApplication(currentPolicyId, msg.sender);

        return currentPolicyId;
    }
}
