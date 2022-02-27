// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

import "./SafePRBMath.sol";

contract SafePRBMathTester {
    function avg(uint256 x, uint256 y) public pure returns (uint256 result) {
        return SafePRBMath.avg(x, y);
    }

    function ceil(uint256 x) public pure returns (uint256 result) {
        return SafePRBMath.ceil(x);
    }

    function div(uint256 x, uint256 y) public pure returns (uint256 result) {
        return SafePRBMath.div(x, y);
    }

    function e() public pure returns (uint256 result) {
        return SafePRBMath.e();
    }

    function exp(uint256 x) public pure returns (uint256 result) {
        return SafePRBMath.exp(x);
    }

    function exp2(uint256 x) public pure returns (uint256 result) {
        return SafePRBMath.exp2(x);
    }

    function floor(uint256 x) public pure returns (uint256 result) {
        return SafePRBMath.floor(x);
    }

    function frac(uint256 x) public pure returns (uint256 result) {
        return SafePRBMath.frac(x);
    }

    function fromUint(uint256 x) public pure returns (uint256 result) {
        return SafePRBMath.fromUint(x);
    }

    function gm(uint256 x, uint256 y) public pure returns (uint256 result) {
        return SafePRBMath.gm(x, y);
    }

    function inv(uint256 x) public pure returns (uint256 result) {
        return SafePRBMath.inv(x);
    }

    function ln(uint256 x) public pure returns (uint256 result) {
        return SafePRBMath.ln(x);
    }

    function log10(uint256 x) public pure returns (uint256 result) {
        return SafePRBMath.log10(x);
    }

    function log2(uint256 x) public pure returns (uint256 result) {
        return SafePRBMath.log2(x);
    }

    function mul(uint256 x, uint256 y) public pure returns (uint256 result) {
        return SafePRBMath.mul(x, y);
    }

    function pi() public pure returns (uint256 result) {
        return SafePRBMath.pi();
    }

    function pow(uint256 x, uint256 y) public pure returns (uint256 result) {
        return SafePRBMath.pow(x, y);
    }

    function powu(uint256 x, uint256 y) public pure returns (uint256 result) {
        return SafePRBMath.powu(x, y);
    }

    function scale() public pure returns (uint256 result) {
        return SafePRBMath.scale();
    }

    function sqrt(uint256 x) public pure returns (uint256 result) {
        return SafePRBMath.sqrt(x);
    }

    function toUint(uint256 x) public pure returns (uint256 result) {
        return SafePRBMath.toUint(x);
    }
}
