// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

interface IFlightOracle {
    function newOracleRequest(
        uint256 _payment,
        string memory _url,
        string memory _path,
        int256 times
    ) external returns (bytes32);

    // Set a new url
    function setURL(string memory _url) external;

    // Set the oracle address
    function setOracleAddress(address _newOracle) external;

    // Set a new job id
    function setJobId(bytes32 _newJobId) external;

    // Set a new policy flow
    function setPolicyFlow(address _policyFlow) external;

    function getChainlinkTokenAddress() external view returns (address);
}
