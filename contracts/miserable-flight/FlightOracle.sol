// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "./interfaces/IPolicyFlow.sol";

/**
 * @title  Flight Oracle
 * @notice This is the flight oracle contract.
 *         Called by policyFlow contract and send the request to chainlink node.
 *         After receiving the result, call the policyFlow contract to do the settlement.
 * @dev    Remember to set the url, oracleAddress and jobId
 */
contract FlightOracle is ChainlinkClient {
    using Chainlink for Chainlink.Request;

    address public owner;

    IPolicyFlow public policyFlow;

    address private oracleAddress;
    bytes32 private jobId;

    constructor(address _policyFlow, address _link) {
        policyFlow = IPolicyFlow(_policyFlow);

        setChainlinkToken(_link);
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************** Modifiers *************************************** //
    // ---------------------------------------------------------------------------------------- //

    // Only the owner can call some functions
    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }

    // Only the policyFlow can call some functions
    modifier onlyPolicyFlow() {
        require(
            msg.sender == address(policyFlow),
            "Only the policyflow can call this function"
        );
        _;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ View Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Returns the address of the LINK token
     * @dev This is the public implementation for chainlinkTokenAddress, which is
     *      an internal method of the ChainlinkClient contract
     */
    function getChainlinkTokenAddress() external view returns (address) {
        return chainlinkTokenAddress();
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Set Functions ************************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Set the oracle address
     */
    function setOracleAddress(address _newOracle) external onlyOwner {
        oracleAddress = _newOracle;
    }

    /**
     * @notice Set a new job id
     */
    function setJobId(bytes32 _newJobId) external onlyOwner {
        jobId = _newJobId;
    }

    /**
     * @notice Change the policy flow contract address
     */
    function setPolicyFlow(address _policyFlow) external onlyOwner {
        policyFlow = IPolicyFlow(_policyFlow);
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
    ) public onlyPolicyFlow returns (bytes32) {
        Chainlink.Request memory req = buildChainlinkRequest(
            jobId,
            address(this),
            this.fulfill.selector
        );
        req.add("url", _url);
        req.add("path", _path);
        req.addInt("times", _times);
        return sendChainlinkRequestTo(oracleAddress, req, _payment);
    }

    /**
     * @notice The fulfill method from requests created by this contract
     * @dev The recordChainlinkFulfillment protects this function from being called
     *      by anyone other than the oracle address that the request was sent to
     * @param _requestId The ID that was generated for the request
     * @param _data The answer provided by the oracle
     */
    function fulfill(bytes32 _requestId, uint256 _data)
        public
        recordChainlinkFulfillment(_requestId)
    {
        policyFlow.finalSettlement(_requestId, _data);
    }
}
