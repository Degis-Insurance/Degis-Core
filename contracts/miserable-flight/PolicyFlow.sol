// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;
import "../proxy/OwnableUpgradeable.sol";
import "../tokens/interfaces/IBuyerToken.sol";
import "./interfaces/ISigManager.sol";
import "./interfaces/IFDPolicyToken.sol";
import "./interfaces/IFlightOracle.sol";
import "./interfaces/IInsurancePool.sol";
import "./interfaces/IPolicyStruct.sol";
import "./abstracts/PolicyParameters.sol";
import "../libraries/StringsUtils.sol";
import "../libraries/StablecoinDecimal.sol";

contract PolicyFlow is IPolicyStruct, PolicyParameters, OwnableUpgradeable {
    using StringsUtils for uint256;
    using StablecoinDecimal for uint256;

    // Other contracts
    IBuyerToken public buyerToken;
    ISigManager public sigManager;
    IFDPolicyToken public policyToken;
    IFlightOracle public flightOracle;
    IInsurancePool public insurancePool;

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Variables **************************************** //
    // ---------------------------------------------------------------------------------------- //

    string public FLIGHT_STATUS_URL = "https://degis.io:3207/flight_status?";

    uint256 public totalPolicies;

    uint256 public fee;

    mapping(uint256 => PolicyInfo) public policyList;

    mapping(address => uint256[]) userPolicyList;

    mapping(bytes32 => uint256) requestList;

    mapping(uint256 => uint256) delayResultList;

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Events ***************************************** //
    // ---------------------------------------------------------------------------------------- //
    event FeeChanged(uint256 newFee);
    event MaxPayoffChanged(uint256 newMaxPayoff);
    event MinTimeBeforeDepartureChanged(uint256 newMinTime);
    event FlightOracleChanged(address newOracle);
    event OracleUrlChanged(string newUrl);
    event DelayThresholdChanged(uint256 thresholdMin, uint256 thresholdMax);

    event NewPolicyApplication(uint256 policyId, address indexed user);
    event NewClaimRequest(
        uint256 policyId,
        string flightNumber,
        bytes32 requestId
    );
    event PolicySold(uint256 policyId, address indexed user);
    event PolicyDeclined(uint256 policyId, address indexed user);
    event PolicyClaimed(uint256 policyId, address indexed user);
    event PolicyExpired(uint256 policyId, address indexed user);
    event FulfilledOracleRequest(uint256 policyId, bytes32 requestId);
    event PolicyOwnerTransfer(uint256 indexed tokenId, address newOwner);

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Initializer ************************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Initializer of the PolicyFlow contract
     * @dev Upgradeable contracts do not have a constrcutor
     * @param _insurancePool The InsurancePool contract address
     * @param _policyToken The PolicyToken contract address
     * @param _sigManager The SigManager contract address
     * @param _buyerToken The BuyerToken contract address
     */
    function initialize(
        address _insurancePool,
        address _policyToken,
        address _sigManager,
        address _buyerToken
    ) public initializer {
        __Ownable_init(msg.sender);
        __PolicyFlow_init(
            _insurancePool,
            _policyToken,
            _sigManager,
            _buyerToken
        );
    }

    function __PolicyFlow_init(
        address _insurancePool,
        address _policyToken,
        address _sigManager,
        address _buyerToken
    ) internal onlyInitializing {
        insurancePool = IInsurancePool(_insurancePool);
        policyToken = IFDPolicyToken(_policyToken);
        sigManager = ISigManager(_sigManager);
        buyerToken = IBuyerToken(_buyerToken);

        // Set the oracle fee
        fee = 0.1 * 10**18;
    }

    // ----------------------------------------------------------------------------------- //
    // ********************************* View Functions ********************************** //
    // ----------------------------------------------------------------------------------- //

    /**
     * @notice Show a user's policies (all)
     * @dev Should only be checked for frontend
     * @param _user User's address
     * @return userPolicies User's all policy details
     */
    function viewUserPolicy(address _user)
        external
        view
        returns (PolicyInfo[] memory)
    {
        uint256 userPolicyAmount = userPolicyList[_user].length;
        require(userPolicyAmount > 0, "No policy for this user");

        PolicyInfo[] memory result = new PolicyInfo[](userPolicyAmount);

        for (uint256 i = 0; i < userPolicyAmount; i++) {
            uint256 policyId = userPolicyList[_user][i];

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
    function setFee(uint256 _fee) external onlyOwner {
        fee = _fee;
        emit FeeChanged(_fee);
    }

    /**
     * @notice Change the max payoff
     * @param _newMaxPayoff New maxpayoff amount
     */
    function setMaxPayoff(uint256 _newMaxPayoff) external onlyOwner {
        MAX_PAYOFF = _newMaxPayoff;
        emit MaxPayoffChanged(_newMaxPayoff);
    }

    /**
     * @notice How long before departure when users can not buy new policies
     * @param _newMinTime New time set
     */
    function setMinTimeBeforeDeparture(uint256 _newMinTime) external onlyOwner {
        MIN_TIME_BEFORE_DEPARTURE = _newMinTime;
        emit MinTimeBeforeDepartureChanged(_newMinTime);
    }

    /**
     * @notice Change the oracle address
     * @param _oracleAddress New oracle address
     */
    function setFlightOracle(address _oracleAddress) external onlyOwner {
        flightOracle = IFlightOracle(_oracleAddress);
        emit FlightOracleChanged(_oracleAddress);
    }

    /**
     * @notice Set a new url
     */
    function setURL(string memory _url) external onlyOwner {
        FLIGHT_STATUS_URL = _url;
        emit OracleUrlChanged(_url);
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
        emit DelayThresholdChanged(_thresholdMin, _thresholdMax);
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Buy a new flight delay policy
     * @dev The transaction should have the signature from the backend server
     * @dev Premium is in stablecoin, so it is 6 decimals
     * @param _productId ID of the purchased product (0: flightdelay; 1,2,3...: others)
     * @param _flightNumber Flight number in string (e.g. "AQ1299")
     * @param _premium Premium of this policy (decimals: 6)
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
            _departureTimestamp,
            _landingDate,
            _msgSender(),
            _premium,
            _deadline
        );

        // Generate the policy
        // Use ++totalPolicies to keep the policyId the same as ERC721 tokenId
        // Policy Id starts from 1
        uint256 currentPolicyId = ++totalPolicies;

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
        buyerToken.mintBuyerToken(msg.sender, _premium.toNormal());

        // Store the policy's total order with userAddress
        userPolicyList[msg.sender].push(totalPolicies);

        emit NewPolicyApplication(currentPolicyId, msg.sender);

        return currentPolicyId;
    }

    /**
     * @notice Make a claim request
     * @dev Anyone can make a new claim
     * @param _policyId The total order/id of the policy
     * @param _flightNumber The flight number
     * @param _timestamp The flight departure timestamp
     * @param _path Which data in json needs to get
     * @param _forceUpdate Owner can force to update
     */
    function newClaimRequest(
        uint256 _policyId,
        string memory _flightNumber,
        string memory _timestamp,
        string memory _path,
        bool _forceUpdate
    ) public {
        PolicyInfo memory policy = policyList[_policyId];

        // Can not get the result before landing date
        // Landing date may not be true, may be a fixed interval (4hours)
        require(
            block.timestamp >= policy.landingTimestamp,
            "Can only claim a policy after its expected landing timestamp"
        );

        // Check if the policy has been settled
        require(
            (!policy.alreadySettled) ||
                (_forceUpdate && (_msgSender() == owner())),
            "Already settled"
        );

        // Check if the flight number is correct
        require(
            keccak256(abi.encodePacked(_flightNumber)) ==
                keccak256(abi.encodePacked(policy.flightNumber)),
            "Wrong flight number provided"
        );

        // Check if the departure date is correct
        require(
            keccak256(abi.encodePacked(_timestamp)) ==
                keccak256(
                    abi.encodePacked(policy.departureTimestamp.uintToString())
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

        emit NewClaimRequest(_policyId, _flightNumber, requestId);
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
            _policyExpired(premium, MAX_PAYOFF, buyerAddress, policyId);
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
     * @param _user user's address
     * @param _policyId the unique policy ID
     */
    function _policyCheck(
        uint256 _premium,
        uint256 _payoff,
        address _user,
        uint256 _policyId
    ) internal {
        // Whether there are enough capacity in the pool
        bool _isAccepted = insurancePool.checkCapacity(_payoff);

        if (_isAccepted) {
            insurancePool.updateWhenBuy(_premium, _payoff, _user);
            policyList[_policyId].status = PolicyStatus.SOLD;
            emit PolicySold(_policyId, _user);

            policyToken.mintPolicyToken(_user);
        } else {
            emit PolicyDeclined(_policyId, _user);
            revert("not sufficient capacity in the insurance pool");
        }
    }

    /**
     * @notice update the policy when it is expired
     * @param _premium the premium of the policy sold
     * @param _payoff the payoff of the policy sold
     * @param _user user's address
     * @param _policyId the unique policy ID
     */
    function _policyExpired(
        uint256 _premium,
        uint256 _payoff,
        address _user,
        uint256 _policyId
    ) internal {
        insurancePool.updateWhenExpire(_premium, _payoff);
        policyList[_policyId].status = PolicyStatus.EXPIRED;
        emit PolicyExpired(_policyId, _user);
    }

    /**
     * @notice Update the policy when it is claimed
     * @param _premium Premium of the policy sold
     * @param _payoff Payoff of the policy sold
     * @param _user User's address
     * @param _policyId The unique policy ID
     */
    function _policyClaimed(
        uint256 _premium,
        uint256 _payoff,
        address _user,
        uint256 _policyId
    ) internal {
        insurancePool.payClaim(_premium, MAX_PAYOFF, _payoff, _user);
        policyList[_policyId].status = PolicyStatus.CLAIMED;
        emit PolicyClaimed(_policyId, _user);
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

        payoff = payoff * 1e6;
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
        uint256 _departureTimestamp,
        uint256 _landingDate,
        address _address,
        uint256 _premium,
        uint256 _deadline
    ) internal view {
        sigManager.checkSignature(
            signature,
            _flightNumber,
            _departureTimestamp,
            _landingDate,
            _address,
            _premium,
            _deadline
        );
    }
}
