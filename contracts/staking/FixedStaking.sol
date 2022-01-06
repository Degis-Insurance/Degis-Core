// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "../tokens/interfaces/IDegisToken.sol";
import "../utils/Ownable.sol";

contract FixedStaking is Ownable {
    uint256[] public stakingLength;
    mapping(uint256 => bool) isValidLength;

    constructor() {}

    function addStakingLength(uint256 _length) external onlyOwner {
        stakingLength.push(_length);
        isValidLength[_length] = true;
    }

    function stake(uint256 _amount, uint256 _length) external {}
}
