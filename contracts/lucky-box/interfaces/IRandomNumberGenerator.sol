// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IRandomNumberGenerator {
    /**
     * @notice Views random result
     */
    function getRandomNumber() external;

    function randomResult() external view returns (uint32);

    function latestLotteryId() external view returns (uint256);
}
