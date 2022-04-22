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
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {IVeDEG} from "../governance/interfaces/IVeDEG.sol";

/**
 * @title Degis Income Sharing Contract
 * @notice This contract will receive part of the income from Degis products
 *         And the income will be shared by DEG holders
 *         The share will be distributed every week
 */
contract IncomeSharing is OwnableUpgradeable, PausableUpgradeable {
    using SafeERC20 for IERC20;

    string public constant name = "Degis Income Sharing Contract";

    uint256 public constant WEIGHT_MULTIPLIER = 1e6;

    IERC20 usd;
    IERC20 degis;
    IVeDEG veDEG;

    event NewRoundStart(
        uint256 currentRound,
        uint256 totalReward,
        uint256 length,
        uint256 start,
        uint256 end
    );

    // Errors start with prefix: Degis Income Sharing - DIS
    error DIS__NotEnoughUSD();
    error DIS__AlreadyInRound();
    error DIS__RoundClosed();
    error DIS__ZeroAmount();

    struct UserInfo {
        uint256 balance;
        uint256[] pendingRounds;
        uint256 lastRewardRoundIndex;
    }
    mapping(address => UserInfo) public users;

    mapping(address => mapping(uint256 => uint256)) public userWeightInRound;

    struct RoundInfo {
        uint256 totalReward;
        uint256 rewardPerSecond;
        uint256 totalShares;
        uint256 totalWeight;
        uint256 startTimestamp;
        uint256 endTimestamp;
        uint256 rewardPerWeight;
    }
    mapping(uint256 => RoundInfo) public rounds;

    uint256 public currentRound;

    ///

    ///

    /// Initialize
    function initialize(
        address _degis,
        address _usd,
        address _veDEG
    ) public initializer {
        __Ownable_init();
        __Pausable_init();

        usd = IERC20(_usd);
        degis = IERC20(_degis);
        veDEG = IVeDEG(_veDEG);
    }

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
        if (_amount > usd.balanceOf(address(this))) revert DIS__NotEnoughUSD();
        if (block.timestamp <= rounds[currentRound].endTimestamp)
            revert DIS__AlreadyInRound();

        // Start a new round from now
        RoundInfo storage newRound = rounds[++currentRound];
        newRound.totalReward = _amount;
        newRound.startTimestamp = block.timestamp;
        newRound.endTimestamp = block.timestamp + _length;
        newRound.rewardPerSecond = _amount / _length;

        emit NewRoundStart(
            currentRound,
            _amount,
            _length,
            block.timestamp,
            block.timestamp + _length
        );
    }

    function deposit(uint256 _amount) public {
        if (_amount == 0) revert DIS__ZeroAmount();

        RoundInfo storage round = rounds[currentRound];

        if (block.timestamp > round.endTimestamp) revert DIS__RoundClosed();

        // Update total shares
        round.totalShares += _amount;

        // Update total weight
        uint256 weight = _calcWeight(round.startTimestamp, round.endTimestamp);
        round.totalWeight += weight;

        // Update user state
        users[msg.sender].balance += _amount;

        degis.safeTransferFrom(msg.sender, address(this), _amount);
    }

    /**
     * @notice Refresh the position to take part in the next round
     */
    function refresh() public {}

    function delegateDeposit(address _user) public onlyOwner {}

    function _calcWeight(uint256 _start, uint256 _end)
        internal
        view
        returns (uint256 weight)
    {
        weight =
            ((_end - block.timestamp) * WEIGHT_MULTIPLIER) /
            (_end - _start);
    }

    function redeem() public {
        RoundInfo storage round = rounds[currentRound];

        uint256 timePassed = block.timestamp - round.startTimestamp;
        uint256 totalReward = round.rewardPerSecond * timePassed;

        // Clear the user record
        delete users[msg.sender];
    }

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

    /**
     * @notice Finish the usd transfer
     * @dev Safe means not transfer exceeds the balance of contract
     *      Manually change the reward speed
     * @param _to Address to transfer
     * @param _amount Amount to transfer
     * @return realAmount Real amount transferred
     */
    function safeUSDTranfer(address _to, uint256 _amount)
        internal
        returns (uint256)
    {
        uint256 balance = IERC20(usd).balanceOf(address(this));

        if (_amount > balance) {
            IERC20(usd).safeTransfer(_to, balance);
            return balance;
        } else {
            IERC20(usd).safeTransfer(_to, _amount);
            return _amount;
        }
    }
}
