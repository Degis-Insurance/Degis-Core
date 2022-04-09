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

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title Degis Income Sharing Contract
 * @notice This contract will receive part of the income from Degis products
 *         And the income will be shared by DEG holders
 *         The share will be distributed every week
 */
contract IncomeSharing is OwnableUpgradeable {
    using SafeERC20 for IERC20;

    string public constant name = "Degis Income Sharing Contract";

    IERC20 usd;
    IERC20 degis;

    event NewRoundStart(
        uint256 currentRound,
        uint256 totalReward,
        uint256 length
    );

    error NotEnoughUSD();
    error AlreadyInRound();
    error RoundClosed();
    error ZeroAmount();

    struct UserInfo {
        uint256 balance;
        uint256 rewardDebt;
    }
    mapping(address => UserInfo) public users;

    struct RoundInfo {
        uint256 totalReward;
        uint256 totalShares;
        uint256 totalWeight;
        uint256 startTimestamp;
        uint256 endTimestamp;
    }
    mapping(uint256 => RoundInfo) public rounds;

    uint256 public currentRound;

    function initialize() public initializer {}

    function getRoundInfo(uint256 _round)
        external
        view
        returns (RoundInfo memory)
    {
        return rounds[_round];
    }

    /**
     * @notice Start a new round
     */
    function startRound(uint256 _amount, uint256 _length) public onlyOwner {
        if (_amount > usd.balanceOf(address(this))) revert NotEnoughUSD();
        if (block.timestamp <= rounds[currentRound].endTimestamp)
            revert AlreadyInRound();

        // Start a new round from now
        rounds[++currentRound] = RoundInfo(
            _amount,
            0,
            0,
            block.timestamp,
            block.timestamp + _length
        );

        emit NewRoundStart(currentRound, _amount, _length);
    }

    function deposit(uint256 _amount) public {
        if (_amount == 0) revert ZeroAmount();

        RoundInfo storage round = rounds[currentRound];

        if (block.timestamp > round.endTimestamp) revert RoundClosed();

        round.totalShares += _amount;

        degis.safeTransferFrom(msg.sender, address(this), _amount);
    }

    function _calcWeight(uint256 _endTime) internal returns (uint256) {}

    function redeem(uint256 _amount) public {}

    modifier hasPassedInterval() {
        _;
    }

    function distribute() external hasPassedInterval {
        ++currentRound;
    }

    /**
     * @notice Claim the user's income
     */
    function claim() external {
        uint256 pendingIncome;

        usd.safeTransfer(msg.sender, pendingIncome);
    }
}
