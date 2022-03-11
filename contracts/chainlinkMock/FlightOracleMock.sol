// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

import "../miserable-flight/interfaces/IPolicyFlow.sol";
import "../utils/Ownable.sol";

/**
 * @title  Flight Oracle Mock
 * @notice Mock oracle contract for test.
 */
contract FlightOracleMock is Ownable {
    IPolicyFlow public policyFlow;

    uint256 public delayResult; // For test

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Events ***************************************** //
    // ---------------------------------------------------------------------------------------- //

    event PolicyFlowChanged(address newPolicyFlow);

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Need the address of LINK token on specific network
     */
    constructor(address _policyFlow) Ownable(msg.sender) {
        policyFlow = IPolicyFlow(_policyFlow);
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************** Modifiers *************************************** //
    // ---------------------------------------------------------------------------------------- //

    // Only the policyFlow can call some functions
    modifier onlyPolicyFlow() {
        require(
            msg.sender == address(policyFlow),
            "Only the policyflow can call this function"
        );
        _;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Set Functions ************************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Change the policy flow contract address
     */
    function setPolicyFlow(address _policyFlow) external onlyOwner {
        policyFlow = IPolicyFlow(_policyFlow);
        emit PolicyFlowChanged(_policyFlow);
    }

    function setResult(uint256 _delayResult) external {
        delayResult = _delayResult;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Creates a request to the specified Oracle contract address
     * @dev This function ignores the stored Oracle contract address and
     *      will instead send the request to the address specified
     * @param _payment Payment to the oracle
     * @param _url The URL to fetch data from
     * @param _path The dot-delimited path to parse of the response
     * @param _times The number to multiply the result by
     */
    function newOracleRequest(
        uint256 _payment,
        string memory _url,
        string memory _path,
        int256 _times
    ) public view onlyPolicyFlow returns (bytes32 requestId) {
        requestId = keccak256(abi.encodePacked(_payment, _url, _path, _times));

        // fulfill(test_hash, delayResult);
        return requestId;
    }

    /**
     * @notice The fulfill method from requests created by this contract
     * @dev The recordChainlinkFulfillment protects this function from being called
     *      by anyone other than the oracle address that the request was sent to
     * @param _requestId The ID that was generated for the request
     */
    function fulfill(bytes32 _requestId) public {
        policyFlow.finalSettlement(_requestId, delayResult);
    }
}
