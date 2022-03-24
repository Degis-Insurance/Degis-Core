// SPDX-License-Identifier: GPL-3.0-or-later

/*
 //======================================================================\\
 //======================================================================\\
    *******         **********     ***********     *****     ***********
    *      *        *              *                 *       *
    *        *      *              *                 *       *
    *         *     *              *                 *       *
    *         *     *              *                 *       *
    *         *     **********     *       *****     *       ***********
    *         *     *              *         *       *                 *
    *         *     *              *         *       *                 *
    *        *      *              *         *       *                 *
    *      *        *              *         *       *                 *
    *******         **********     ***********     *****     ***********
 \\======================================================================//
 \\======================================================================//
*/

pragma solidity ^0.8.10;

import {Ownable} from "../utils/Ownable.sol";
import {BasePool} from "./abstracts/BasePool.sol";

contract CoreStakingPool is Ownable, BasePool {
    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //

    constructor(
        address _degisToken,
        address _poolToken,
        address _factory,
        uint256 _startTimestamp,
        uint256 _degisPerSecond
    )
        Ownable(msg.sender)
        BasePool(
            _degisToken,
            _poolToken,
            _factory,
            _startTimestamp,
            _degisPerSecond
        )
    {}

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Stake function, will call the stake in BasePool
     * @param _user User address
     * @param _amount Amount to stake
     * @param _lockUntil Lock until timestamp (0 means flexible staking)
     */
    function _stake(
        address _user,
        uint256 _amount,
        uint256 _lockUntil
    ) internal override {
        super._stake(_user, _amount, _lockUntil);
    }

    /**
     * @notice Unstake function, will check some conditions and call the unstake in BasePool
     * @param _user User address
     * @param _depositId Deposit id
     * @param _amount Amount to unstake
     */
    function _unstake(
        address _user,
        uint256 _depositId,
        uint256 _amount
    ) internal override {
        UserInfo storage user = users[_msgSender()];
        Deposit memory stakeDeposit = user.deposits[_depositId];
        require(
            stakeDeposit.lockedFrom == 0 ||
                block.timestamp >= stakeDeposit.lockedUntil,
            "Deposit not yet unlocked"
        );

        super._unstake(_user, _depositId, _amount);
    }
}
