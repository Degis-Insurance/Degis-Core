// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";

import "../utils/Ownable.sol";

import "../tokens/interfaces/IBuyerToken.sol";

import "./PolicyParameters.sol";

contract PolicyFlow is ChainlinkClient, PolicyParameters, Ownable {
    using Chainlink for Chainlink.Request;

    // Other contracts
    IBuyerToken buyerToken;

    string public FLIGHT_STATUS_URL =
        "https://18.163.254.50:3207/flight_status?";

    uint256 public totalPolicies;

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
    mapping(uint256 => PolicyInfo) policyList;

    mapping(address => uint256[]) userPolicyList;

    mapping(uint256 => uint256) resultList;

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //
    constructor(
        address _insurancePool,
        address _policyToken,
        address _sigManager,
        address _buyerToken
    ) {
        buyerToken = IBuyerToken(_buyerToken);
    }
}
