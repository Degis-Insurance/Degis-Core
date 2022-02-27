// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

import "./IPolicyStruct.sol";

/**
 * @title  IPolicyFlow
 * @notice This is the interface of PolicyFlow contract.
 *         Contains some type definations, event list and function declarations.
 */
interface IPolicyFlow is IPolicyStruct {
    /// @notice Function declarations

    /// @notice Apply for a new policy
    function newApplication(
        uint256 _productId,
        string memory _flightNumber,
        uint256 _premium,
        uint256 _departureTimestamp,
        uint256 _landingTimestamp,
        uint256 _deadline,
        bytes calldata signature
    ) external returns (uint256 policyId);

    /// @notice Start a new claim request
    function newClaimRequest(
        uint256 _policyId,
        string memory _flightNumber,
        string memory _timestamp,
        string memory _path,
        bool _forceUpdate
    ) external;

    /// @notice View a user's policy info
    function viewUserPolicy(address)
        external
        view
        returns (PolicyInfo[] memory);

    /// @notice Get the policy info by its policyId
    function getPolicyInfoById(uint256)
        external
        view
        returns (PolicyInfo memory);

    /// @notice Update when the policy token is transferred to another owner
    function policyOwnerTransfer(
        uint256,
        address,
        address
    ) external;

    /// @notice Do the final settlement when receiving the oracle result
    function finalSettlement(bytes32 _requestId, uint256 _result) external;
}
