// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.13;

interface IDoubleRewarder {
    function distributeReward(
        address rewardToken,
        address user,
        uint256 newLpAmount
    ) external;

    // Get the pending reward
    function pendingReward(address user) external view returns (uint256);

    // Get the reward token address
    function rewardToken() external view returns (address);
}
