// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

/**
 * @title Illuvium Pool
 *
 * @notice An abstraction representing a pool, see IlluviumPoolBase for details
 *
 * @author Pedro Bergamini, reviewed by Basil Gorin
 */
interface IPool {
    /**
     * @dev Deposit is a key data structure used in staking,
     *      it represents a unit of stake with its amount, weight and term (time interval)
     */
    struct Deposit {
        // @dev token amount staked
        uint256 tokenAmount;
        // @dev stake weight
        uint256 weight;
        // @dev locking period - from
        uint256 lockedFrom;
        // @dev locking period - until
        uint256 lockedUntil;
    }

    // for the rest of the functions see Soldoc in IlluviumPoolBase

    function degisToken() external view returns (address);

    function poolToken() external view returns (address);

    function startTimestamp() external view returns (uint256);

    function degisPerSecond() external view returns (uint256);

    function totalWeight() external view returns (uint256);

    function accDegisPerWeight() external view returns (uint256);

    function pendingReward(address _user) external view returns (uint256);

    function setDegisPerSecond(uint256 _degisPerSecond) external;
}
