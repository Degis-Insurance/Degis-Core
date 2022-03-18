// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "./interfaces/IPolicyFlow.sol";
import "../utils/Ownable.sol";

/**
 * @title  Flight Oracle
 * @notice This is the flight oracle contract.
 *         Called by policyFlow contract and send the request to chainlink node.
 *         After receiving the result, call the policyFlow contract to do the settlement.
 * @dev    Remember to set the url, oracleAddress and jobId
 *         If there are multiple oracle providers in the future, this contract may need to be updated.
 */
contract FlightOracle is ChainlinkClient, Ownable {
    using Chainlink for Chainlink.Request;

    IPolicyFlow public policyFlow;

    address public oracleAddress;
    bytes32 public jobId;

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Events ***************************************** //
    // ---------------------------------------------------------------------------------------- //

    event OracleAddressChanged(address newOracle);
    event JobIdChanged(bytes32 newJobId);
    event PolicyFlowChanged(address newPolicyFlow);

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Need the address of LINK token on specific network
     */
    constructor(address _policyFlow, address _link) Ownable(msg.sender) {
        policyFlow = IPolicyFlow(_policyFlow);

        setChainlinkToken(_link);

        oracleAddress = 0x7D9398979267a6E050FbFDFff953Fc612A5aD4C9;
        jobId = "bcc0a699531940479bc93cf9fa5afb3f";
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
        emit OracleAddressChanged(_newOracle);
    }

    /**
     * @notice Set a new job id
     */
    function setJobId(bytes32 _newJobId) external onlyOwner {
        jobId = _newJobId;
        emit JobIdChanged(_newJobId);
    }

    /**
     * @notice Change the policy flow contract address
     */
    function setPolicyFlow(address _policyFlow) external onlyOwner {
        policyFlow = IPolicyFlow(_policyFlow);
        emit PolicyFlowChanged(_policyFlow);
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
        require(
            oracleAddress != address(0) && jobId != 0,
            "Set the oracle address & jobId"
        );

        // Enough LINK token for payment
        require(
            LinkTokenInterface(chainlinkTokenAddress()).balanceOf(
                address(this)
            ) >= _payment,
            "Insufficient LINK balance"
        );

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
