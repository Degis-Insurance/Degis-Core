// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

interface IRandomNumberGenerator {
    /**
     * @notice Views random result
     */
    function getRandomNumber() external;

    function randomResult() external view returns (uint32);

    function latestLotteryId() external view returns (uint256);
}
