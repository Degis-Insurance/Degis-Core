// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.13;

interface IDoubleRewarder {
    function distributeReward(
        address lpToken,
        address rewardToken,
        address user,
        uint256 userAmount,
        uint256 lpSupply
    ) external;

    // Get the pending reward
    function pendingReward(address _token, address user)
        external
        view
        returns (uint256);

    // Get the reward token address
    function rewardToken() external view returns (address);
}
