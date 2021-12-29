// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IRandomNumberGenerator {
    /**
     * @notice Requests randomness from a user-provided seed
     */
    function getRandomNumber() external;

    /**
     * @notice Views random result
     */
    function getRandomResult() external view returns (uint32);

    function viewLatestLotteryId() external view returns (uint256);
}
