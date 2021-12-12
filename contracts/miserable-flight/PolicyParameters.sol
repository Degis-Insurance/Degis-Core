// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract PolicyParameters {
    uint256 public constant PRODUCT_ID = 0;

    // Parameters about the claim curve
    uint256 public MAX_PAYOFF = 180 ether;
    uint256 public DELAY_THRESHOLD_MIN = 30;
    uint256 public DELAY_THRESHOLD_MAX = 240;

    // Minimum time before departure for applying
    uint256 public MIN_TIME_BEFORE_DEPARTURE = 24 hours;

    /// @notice Event list
    event newPolicyApplication(uint256 _policyID, address indexed _userAddress);
    event PolicySold(uint256 _policyID, address indexed _userAddress);
    event PolicyDeclined(uint256 _policyID, address indexed _userAddress);
    event PolicyClaimed(uint256 _policyID, address indexed _userAddress);
    event PolicyExpired(uint256 _policyID, address indexed _userAddress);
    event FulfilledOracleRequest(uint256 _policyId, bytes32 _requestId);
    event PolicyOwnerTransfer(uint256 indexed _tokenId, address _newOwner);
    event DelayThresholdSet(uint256 _thresholdMin, uint256 _thresholdMax);
}
