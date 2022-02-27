// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

interface IPolicyStruct {
    enum PolicyStatus {
        INI,
        SOLD,
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
}
