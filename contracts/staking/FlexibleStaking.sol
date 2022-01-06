// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "../tokens/interfaces/IDegisToken.sol";
import "../utils/Ownable.sol";

contract FlexibleStaking is Ownable {
    IDegisToken degis;

    constructor() {}

    function getStakingWeight(uint256 _length) public pure returns (uint256) {
        uint256 weight = 1 + (_length) / 12;
        return weight;
    }

    function stake(uint256 _amount, uint256 _length) external {}
}
