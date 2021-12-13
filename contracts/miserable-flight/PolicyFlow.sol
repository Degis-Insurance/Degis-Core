// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../utils/Ownable.sol";
import "../utils/Context.sol";

import "../tokens/interfaces/IBuyerToken.sol";
import "./interfaces/ISigManager.sol";
import "./interfaces/IFDPolicyToken.sol";
import "./interfaces/IFlightOracle.sol";
import "./interfaces/IInsurancePool.sol";

import "./interfaces/IPolicyStruct.sol";
import "./abstracts/PolicyParameters.sol";

contract PolicyFlow is IPolicyStruct, PolicyParameters, Ownable, Context {
    // Other contracts
    IBuyerToken public buyerToken;
    ISigManager public sigManager;
    IFDPolicyToken public policyToken;
    IFlightOracle public flightOracle;
    IInsurancePool public insurancePool;

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Variables **************************************** //
    // ---------------------------------------------------------------------------------------- //

    string public FLIGHT_STATUS_URL =
        "https://18.163.254.50:3207/flight_status?";

    uint256 public totalPolicies;

    uint256 public fee;

    mapping(uint256 => PolicyInfo) public policyList;

    mapping(address => uint256[]) userPolicyList;

    mapping(bytes32 => uint256) requestList;

    mapping(uint256 => uint256) delayResultList;

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Events ***************************************** //
    // ---------------------------------------------------------------------------------------- //

    event NewPolicyApplication(uint256 _policyID, address indexed _userAddress);
    event PolicySold(uint256 _policyID, address indexed _userAddress);
    event PolicyDeclined(uint256 _policyID, address indexed _userAddress);
    event PolicyClaimed(uint256 _policyID, address indexed _userAddress);
    event PolicyExpired(uint256 _policyID, address indexed _userAddress);
    event FulfilledOracleRequest(uint256 _policyId, bytes32 _requestId);
    event PolicyOwnerTransfer(uint256 indexed _tokenId, address _newOwner);
    event DelayThresholdSet(uint256 _thresholdMin, uint256 _thresholdMax);

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //

    constructor(
        address _insurancePool,
        address _policyToken,
        address _sigManager,
        address _buyerToken
    ) {
        insurancePool = IInsurancePool(_insurancePool);
        policyToken = IFDPolicyToken(_policyToken);
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
        uint256 currentTimestamp = block.timestamp;
        require(
            currentTimestamp <= _deadline,
            "Expired deadline, please resubmit a transaction"
        );

        require(
            _productId == PRODUCT_ID,
            "You are calling the wrong product contract"
        );

        require(
            _departureTimestamp >= currentTimestamp + MIN_TIME_BEFORE_DEPARTURE,
            "It's too close to the departure time, you cannot buy this policy"
        );

        // Should be signed by operators
        _checkSignature(
            signature,
            _flightNumber,
            _msgSender(),
            _premium,
            _deadline
        );

        // Generate the policy
        uint256 currentPolicyId = totalPolicies;
        policyList[currentPolicyId] = PolicyInfo(
            PRODUCT_ID,
            _msgSender(),
            currentPolicyId,
            _flightNumber,
            _premium,
            MAX_PAYOFF,
            currentTimestamp,
            _departureTimestamp,
            _landingDate,
            PolicyStatus.INI,
            false,
            404
        );

        // Check the policy with the insurance pool status
        // May be accepted or rejected, if accepted then update the status of insurancePool
        _policyCheck(_premium, MAX_PAYOFF, msg.sender, currentPolicyId);

        // Give buyer tokens depending on the usd value they spent
        buyerToken.mintBuyerToken(msg.sender, _premium);

        // Store the policy's total order with userAddress
        userPolicyList[msg.sender].push(totalPolicies);

        // Update total policies
        totalPolicies += 1;

        emit NewPolicyApplication(currentPolicyId, msg.sender);

        return currentPolicyId;
    }

    /** @notice Make a claim request
     *  @param _policyId The total order/id of the policy
     *  @param _flightNumber The flight number
     *  @param _timestamp The flight departure timestamp
     *  @param _path Which data in json needs to get
     *  @param _forceUpdate Owner can force to update
     */
    function newClaimRequest(
        uint256 _policyId,
        string memory _flightNumber,
        string memory _timestamp,
        string memory _path,
        bool _forceUpdate
    ) public {
        // Can not get the result before landing date
        // Landing date may not be true, may be a fixed interval (4hours)
        require(
            block.timestamp >= policyList[_policyId].landingTimestamp,
            "Can only claim a policy after its expected landing timestamp"
        );

        // Check if the policy has been settled
        require(
            (!policyList[_policyId].alreadySettled) ||
                (_forceUpdate && (_msgSender() == owner())),
            "The policy status has already been settled, or you need to make a force update"
        );

        // Check if the flight number is correct
        require(
            keccak256(abi.encodePacked(_flightNumber)) ==
                keccak256(abi.encodePacked(policyList[_policyId].flightNumber)),
            "Wrong flight number provided"
        );

        // Check if the departure date is correct
        require(
            keccak256(abi.encodePacked(_timestamp)) ==
                keccak256(
                    abi.encodePacked(policyList[_policyId].departureTimestamp)
                ),
            "Wrong departure timestamp provided"
        );

        // Construct the url for oracle

        string memory _url = string(
            abi.encodePacked(
                FLIGHT_STATUS_URL,
                "flight_no=",
                _flightNumber,
                "&timestamp=",
                _timestamp
            )
        );

        // Start a new oracle request
        bytes32 requestId = flightOracle.newOracleRequest(fee, _url, _path, 1);

        // Record this request
        requestList[requestId] = _policyId;
        policyList[_policyId].alreadySettled = true;
    }

    /**
     * @notice Update information when a policy token's ownership has been transferred
     * @dev This function is called by the ERC721 contract of PolicyToken
     * @param _tokenId Token Id of the policy token
     * @param _oldOwner The initial owner
     * @param _newOwner The new owner
     */
    function policyOwnerTransfer(
        uint256 _tokenId,
        address _oldOwner,
        address _newOwner
    ) external {
        // Check the call is from policy token contract
        require(
            _msgSender() == address(policyToken),
            "only called from the flight delay policy token contract"
        );

        // Check the previous owner record
        uint256 policyId = _tokenId;
        require(
            _oldOwner == policyList[policyId].buyerAddress,
            "The previous owner is wrong"
        );

        // Update the new buyer address
        policyList[policyId].buyerAddress = _newOwner;
        emit PolicyOwnerTransfer(_tokenId, _newOwner);
    }

    // ----------------------------------------------------------------------------------- //
    // ********************************* Oracle Functions ******************************** //
    // ----------------------------------------------------------------------------------- //

    /**
     * @notice Do the final settlement, called by FlightOracle contract
     * @param _requestId Chainlink request id
     * @param _result Delay result (minutes) given by oracle
     */
    function finalSettlement(bytes32 _requestId, uint256 _result) public {
        // Check if the call is from flight oracle
        require(
            msg.sender == address(flightOracle),
            "this function should be called by FlightOracle contract"
        );

        uint256 policyId = requestList[_requestId];

        PolicyInfo storage policy = policyList[policyId];
        policy.delayResult = _result;

        uint256 premium = policy.premium;
        address buyerAddress = policy.buyerAddress;

        require(
            _result <= DELAY_THRESHOLD_MAX || _result == 400,
            "Abnormal oracle result, result should be [0 - 240] or 400"
        );

        if (_result == 0) {
            // 0: on time
            policyExpired(premium, MAX_PAYOFF, buyerAddress, policyId);
        } else if (_result <= DELAY_THRESHOLD_MAX) {
            uint256 real_payoff = calcPayoff(_result);
            _policyClaimed(premium, real_payoff, buyerAddress, policyId);
        } else if (_result == 400) {
            // 400: cancelled
            _policyClaimed(premium, MAX_PAYOFF, buyerAddress, policyId);
        }

        emit FulfilledOracleRequest(policyId, _requestId);
    }

    // ----------------------------------------------------------------------------------- //
    // ******************************** Internal Functions ******************************* //
    // ----------------------------------------------------------------------------------- //

    /**
     * @notice check the policy and then determine whether we can afford it
     * @param _payoff the payoff of the policy sold
     * @param _userAddress user's address
     * @param _policyId the unique policy ID
     */
    function _policyCheck(
        uint256 _premium,
        uint256 _payoff,
        address _userAddress,
        uint256 _policyId
    ) internal {
        // Whether there are enough capacity in the pool
        bool _isAccepted = insurancePool.checkCapacity(_payoff);

        if (_isAccepted) {
            insurancePool.updateWhenBuy(_premium, _payoff, _userAddress);
            policyList[_policyId].status = PolicyStatus.SOLD;
            emit PolicySold(_policyId, _userAddress);

            policyToken.mintPolicyToken(_userAddress);
        } else {
            policyList[_policyId].status = PolicyStatus.DECLINED;
            emit PolicyDeclined(_policyId, _userAddress);
            revert("not sufficient capacity in the insurance pool");
        }
    }

    /**
     * @notice update the policy when it is expired
     * @param _premium the premium of the policy sold
     * @param _payoff the payoff of the policy sold
     * @param _userAddress user's address
     * @param _policyId the unique policy ID
     */
    function policyExpired(
        uint256 _premium,
        uint256 _payoff,
        address _userAddress,
        uint256 _policyId
    ) internal {
        insurancePool.updateWhenExpire(_premium, _payoff, _userAddress);
        policyList[_policyId].status = PolicyStatus.EXPIRED;
        emit PolicyExpired(_policyId, _userAddress);
    }

    /**
     * @notice Update the policy when it is claimed
     * @param _premium Premium of the policy sold
     * @param _payoff Payoff of the policy sold
     * @param _userAddress User's address
     * @param _policyId The unique policy ID
     */
    function _policyClaimed(
        uint256 _premium,
        uint256 _payoff,
        address _userAddress,
        uint256 _policyId
    ) internal {
        insurancePool.payClaim(_premium, MAX_PAYOFF, _payoff, _userAddress);
        policyList[_policyId].status = PolicyStatus.CLAIMED;
        emit PolicyClaimed(_policyId, _userAddress);
    }

    /**
     * @notice The payoff formula
     * @param _delay Delay in minutes
     * @return the final payoff volume
     */
    function calcPayoff(uint256 _delay) internal view returns (uint256) {
        uint256 payoff = 0;

        // payoff model 1 - linear
        if (_delay <= DELAY_THRESHOLD_MIN) {
            payoff = 0;
        } else if (
            _delay > DELAY_THRESHOLD_MIN && _delay <= DELAY_THRESHOLD_MAX
        ) {
            payoff = (_delay * _delay) / 480;
        } else if (_delay > DELAY_THRESHOLD_MAX) {
            payoff = MAX_PAYOFF;
        }

        payoff = payoff * 1e18;
        return payoff;
    }

    /**
     * @notice Check whether the signature is valid
     * @param signature 65 byte array: [[v (1)], [r (32)], [s (32)]]
     * @param _flightNumber Flight number
     * @param _address userAddress
     * @param _premium Premium of the policy
     * @param _deadline Deadline of the application
     */
    function _checkSignature(
        bytes calldata signature,
        string memory _flightNumber,
        address _address,
        uint256 _premium,
        uint256 _deadline
    ) internal view {
        sigManager.checkSignature(
            signature,
            _flightNumber,
            _address,
            _premium,
            _deadline
        );
    }
}
