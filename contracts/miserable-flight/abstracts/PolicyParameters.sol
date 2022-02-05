// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

abstract contract PolicyParameters {
    // Product parameter
    uint256 public constant PRODUCT_ID = 0;

    // Parameters about the claim curve
    uint256 public MAX_PAYOFF = 180 ether;
    uint256 public DELAY_THRESHOLD_MIN = 30;
    uint256 public DELAY_THRESHOLD_MAX = 240;

    // Minimum time before departure for applying
    // TODO: internal test
    uint256 public MIN_TIME_BEFORE_DEPARTURE = 0;
}
