// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract PolicyParameters {
    uint256 public constant PRODUCT_ID = 0;

    uint256 public MAX_PAYOFF = 180 ether;
    uint256 public DELAY_THRESHOLD_MIN = 30;
    uint256 public DELAY_THRESHOLD_MAX = 240;
}
