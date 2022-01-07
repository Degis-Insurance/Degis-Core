// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

interface IStakingPoolFactory {
    function createPool(
        address _poolToken,
        uint256 _startBlock,
        uint256 _degisPerBlock
    ) external;

    function mintReward(address _to, uint256 _amount) external;
}
