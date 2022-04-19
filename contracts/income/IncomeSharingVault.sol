// SPDX-License-Identifier: GPL-3.0-or-later
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
contract IncomeSharingVault is OwnableUpgradeable, PausableUpgradeable {
    using SafeERC20 for IERC20;

    uint256 public constant SCALE = 1e18;

    address usd;
    address degis;
    IVeDEG veDEG;

    struct PoolInfo {
        bool available;
        address rewardToken;
        uint256 roundTime;
        uint256 totalAmount;
        uint256 rewardPerSecond;
        uint256 accRewardPerShare;
        uint256 lastRewardTimestamp;
    }
    // Pool Id
    // 1: USDC.e as reward
    // 2: Shield as reward
    mapping(uint256 => PoolInfo) public pools;

    struct UserInfo {
        uint256 totalAmount;
        uint256 rewardDebt;
    }
    mapping(uint256 => mapping(address => UserInfo)) public users;

    uint256 nextPool;

    event NewRewardPoolStart(
        uint256 poolId,
        address rewardToken,
        uint256 roundTime
    );
    event RewardSpeedSet(uint256 poolId, uint256 rewardPerSecond);
    event PoolUpdated(uint256 poolId, uint256 accRewardPerSecond);
    event Harvest(address user, uint256 amount);
    event Deposit(address user, uint256 poolId, uint256 amount);

    // Errors start with DIS(Degis Income Sharing)
    error DIS__NotEnoughVeDEG();
    error DIS__WrongSpeed();

    function initialize(
        address _degis,
        address _usd,
        address _veDEG
    ) public initializer {
        __Ownable_init();
        __Pausable_init();

        usd = _usd;
        degis = _degis;
        veDEG = IVeDEG(_veDEG);

        nextPool = 1;
    }

    function startPool(address _rewardToken, uint256 _roundTime)
        external
        onlyOwner
    {
        PoolInfo storage pool = pools[nextPool++];

        pool.available = true;
        pool.rewardToken = _rewardToken;
        pool.roundTime = _roundTime;

        emit NewRewardPoolStart(nextPool, _rewardToken, _roundTime);
    }

    function setRewardSpeed(uint256 _poolId, uint256 _rewardPerSecond)
        external
    {
        PoolInfo memory pool = pools[_poolId];
        if (
            pool.roundTime * _rewardPerSecond >
            IERC20(pool.rewardToken).balanceOf(address(this))
        ) revert DIS__WrongSpeed();

        pools[_poolId].rewardPerSecond = _rewardPerSecond;

        emit RewardSpeedSet(_poolId, _rewardPerSecond);
    }

    function deposit(uint256 _poolId, uint256 _amount) external {
        if (veDEG.balanceOf(msg.sender) < _amount) revert DIS__NotEnoughVeDEG();

        updatePool(_poolId);

        // Lock some veDEG to participate
        veDEG.lockVeDEG(msg.sender, _amount);

        PoolInfo storage pool = pools[_poolId];
        UserInfo storage user = users[_poolId][msg.sender];

        if (user.totalAmount > 0) {
            uint256 pending = (pool.accRewardPerShare * user.totalAmount) /
                SCALE -
                user.rewardDebt;

            uint256 reward = _safeRewardTransfer(
                pool.rewardToken,
                msg.sender,
                pending
            );
            emit Harvest(msg.sender, reward);
        }

        pool.totalAmount += _amount;

        user.totalAmount += _amount;

        user.rewardDebt = (pool.accRewardPerShare * user.totalAmount) / SCALE;

        emit Deposit(msg.sender, _poolId, _amount);
    }

    function withdraw(uint256 _poolId, uint256 _amount) external {}

    function updatePool(uint256 _poolId) public {
        PoolInfo storage pool = pools[_poolId];

        if (block.timestamp <= pool.lastRewardTimestamp) return;

        uint256 totalAmount = pool.totalAmount;

        if (totalAmount == 0) {
            pool.lastRewardTimestamp = block.timestamp;
            return;
        }

        uint256 timePassed = block.timestamp - pool.lastRewardTimestamp;

        uint256 reward = timePassed * pool.rewardPerSecond;

        pool.accRewardPerShare += reward / totalAmount;

        pool.lastRewardTimestamp = block.timestamp;

        emit PoolUpdated(_poolId, pool.accRewardPerShare);
    }

    /**
     * @notice Finish the reward token transfer
     * @dev Safe means not transfer exceeds the balance of contract
     *      Manually change the reward speed
     * @param _to Address to transfer
     * @param _amount Amount to transfer
     * @return realAmount Real amount transferred
     */
    function _safeRewardTransfer(
        address _token,
        address _to,
        uint256 _amount
    ) internal returns (uint256) {
        uint256 balance = IERC20(_token).balanceOf(address(this));

        if (_amount > balance) {
            IERC20(_token).safeTransfer(_to, balance);
            return balance;
        } else {
            IERC20(_token).safeTransfer(_to, _amount);
            return _amount;
        }
    }
}
