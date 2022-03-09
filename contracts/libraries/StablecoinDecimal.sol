// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

library StablecoinDecimal {
    function toNormal(uint256 _value) internal pure returns (uint256) {
        uint256 decimal_difference = 1e12;
        return _value / decimal_difference;
    }

    function toStablecoin(uint256 _value) internal pure returns (uint256) {
        uint256 decimal_difference = 1e12;
        return _value * decimal_difference;
    }
}
