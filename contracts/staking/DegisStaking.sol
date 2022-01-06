// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "../utils/Ownable.sol";
import "./abstracts/BasePool.sol";

contract DegisStaking is Ownable, BasePool {
    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //

    constructor(
        address _degisToken,
        address _poolToken,
        address _factory
    ) BasePool(_degisToken, _poolToken, _factory) {}

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     *
     */
    function _stake(
        address _user,
        uint256 _amount,
        uint256 _lockUntil
    ) internal {
        super._stake(_user, _amount, _lockUntil);
    }

    /**
     *
     */
    function _unstake(
        _user,
        _depositId,
        _amount
    ) internal {
        UserInfo storage user = users[_user];
        Deposit memory stakeDeposit = user.deposits[_depositId];
        require(
            stakeDeposit.lockedFrom == 0 ||
                block.timestamp > stakeDeposit.lockedUntil,
            "Deposit not yet unlocked"
        );

        super._unstake(_user, _depositId, _amount);
    }
}
