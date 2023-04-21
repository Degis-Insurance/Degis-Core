// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { PausableUpgradeable } from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import { ReentrancyGuardUpgradeable } from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import { IVeDEG } from "../governance/interfaces/IVeDEG.sol";

/**
 * @title Degis Income Sharing Contract
 * @notice This contract will receive part of the income from Degis products
 *         And the income will be shared by DEG holders (in the form of veDEG)
 *
 *         It is designed to be an ever-lasting reward
 *
 *         This contract will have several pools: one pool for each reward token (e.g. USDC, USDT, etc.)
 *         To enter the income sharing vault, you need to lock some veDEG
 *             - When your veDEG is locked, it can not be withdrawed
 *
 *         The reward is updated each time there is an interaction with the contract.
 *         But the reward amount depends on the token already came to the contract.
 *         It is not a fixed amount of reward per second.
 * 
 *         The income will come from (to be updated)
 *             - IncomeMaker: Collect swap fee in naughty price pool
 *             - PolicyCore: Collect deposit/redeem fee in policy core
 */
contract IncomeSharingVaultV2 is
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20 for IERC20;

    uint256 public constant SCALE = 1e30;

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Variables **************************************** //
    // ---------------------------------------------------------------------------------------- //

    IVeDEG public veDEG;

    struct PoolInfo {
        bool available;
        address rewardToken;
        uint256 totalAmount;
        uint256 accRewardPerShare;
        uint256 lastRewardBalance;
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

    uint256 public nextPool;

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Events ***************************************** //
    // ---------------------------------------------------------------------------------------- //

    event NewRewardPoolStart(uint256 poolId, address rewardToken);
    event RewardSpeedSet(uint256 poolId, uint256 rewardPerSecond);
    event PoolUpdated(uint256 poolId, uint256 accRewardPerSecond);
    event Harvest(address user, uint256 poolId, uint256 amount);
    event Deposit(address user, uint256 poolId, uint256 amount);
    event Withdraw(address user, uint256 poolId, uint256 amount);

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Errors ***************************************** //
    // ---------------------------------------------------------------------------------------- //

    // Errors start with DIS(Degis Income Sharing)
    error DIS__PoolNotAvailable();
    error DIS__ZeroAmount();
    error DIS__NotEnoughVeDEG();
    error DIS__WrongSpeed();

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //

    function initialize(address _veDEG) public initializer {
        __Ownable_init();
        __Pausable_init();
        __ReentrancyGuard_init();

        veDEG = IVeDEG(_veDEG);

        nextPool = 1;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ View Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Pending reward
     * @param _poolId Pool Id
     * @param _user   User address
     * @return pendingReward Amount of pending reward
     */
    function pendingReward(
        uint256 _poolId,
        address _user
    ) external view returns (uint256) {
        PoolInfo memory pool = pools[_poolId];

        uint256 accRewardPerShare = pool.accRewardPerShare;

        if (pool.totalAmount == 0) return 0;
        else {
            UserInfo memory user = users[_poolId][_user];

            uint256 currentRewardBalance = IERC20(pool.rewardToken).balanceOf(
                address(this)
            );

            if (currentRewardBalance != pool.lastRewardBalance) {
                uint256 newReward = currentRewardBalance -
                    pool.lastRewardBalance;

                accRewardPerShare += (newReward * SCALE) / pool.totalAmount;
            }

            uint256 pending = (user.totalAmount * accRewardPerShare) /
                SCALE -
                user.rewardDebt;

            return pending;
        }
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Set Functions ************************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Start a new income sharing pool with its reward token
     * @param _rewardToken Reward token address
     */
    function startPool(address _rewardToken) external onlyOwner {
        PoolInfo storage pool = pools[nextPool++];

        pool.available = true;
        pool.rewardToken = _rewardToken;

        emit NewRewardPoolStart(nextPool - 1, _rewardToken);
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Deposit
     *         Will: update pool, lock veDEG, claim pending reward, update user info
     * 
     * @param _poolId Pool Id
     * @param _amount Amount of tokens to deposit
     */
    function deposit(uint256 _poolId, uint256 _amount) external nonReentrant {
        if (!pools[_poolId].available) revert DIS__PoolNotAvailable();
        if (_amount == 0) revert DIS__ZeroAmount();
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
            pool.lastRewardBalance -= reward;

            emit Harvest(msg.sender, _poolId, reward);
        }

        pool.totalAmount += _amount;
        user.totalAmount += _amount;
        user.rewardDebt = (pool.accRewardPerShare * user.totalAmount) / SCALE;

        emit Deposit(msg.sender, _poolId, _amount);
    }

    /**
     * @notice Withdraw all veDEG from a pool
     * 
     * @param _poolId Pool Id
     */
    function withdrawAll(uint256 _poolId) external {
        withdraw(_poolId, users[_poolId][msg.sender].totalAmount);
    }

    /**
     * @notice Withdraw veDEG from a pool
     *         Will: update pool, unlock veDEG, harvest reward, update user info
     * 
     * @param _poolId Pool Id
     * @param _amount Amount to withdraw
     */
    function withdraw(uint256 _poolId, uint256 _amount) public nonReentrant {
        if (_amount == 0) revert DIS__ZeroAmount();

        PoolInfo storage pool = pools[_poolId];
        UserInfo storage user = users[_poolId][msg.sender];

        if (user.totalAmount < _amount) revert DIS__NotEnoughVeDEG();

        updatePool(_poolId);

        uint256 pending = (pool.accRewardPerShare * user.totalAmount) /
            SCALE -
            user.rewardDebt;

        uint256 reward = _safeRewardTransfer(
            pool.rewardToken,
            msg.sender,
            pending
        );
        pool.lastRewardBalance -= reward;

        emit Harvest(msg.sender, _poolId, reward);

        // Update user info
        pool.totalAmount -= _amount;

        user.totalAmount -= _amount;
        user.rewardDebt = (user.totalAmount * pool.accRewardPerShare) / SCALE;

        // Unlock veDEG
        veDEG.unlockVeDEG(msg.sender, _amount);

        emit Withdraw(msg.sender, _poolId, _amount);
    }

    /**
     * @notice Harvest income reward
     * 
     * @param _poolId Pool Id
     * @param _to     Reward receiver address
     */
    function harvest(
        uint256 _poolId,
        address _to
    ) public nonReentrant whenNotPaused {
        updatePool(_poolId);

        PoolInfo memory pool = pools[_poolId];
        UserInfo storage user = users[_poolId][msg.sender];

        // pending reward
        uint256 pending = (user.totalAmount * pool.accRewardPerShare) /
            SCALE -
            user.rewardDebt;

        user.rewardDebt = (user.totalAmount * pool.accRewardPerShare) / SCALE;

        uint256 reward = _safeRewardTransfer(pool.rewardToken, _to, pending);
        pool.lastRewardBalance -= reward;

        emit Harvest(msg.sender, _poolId, reward);
    }

    /**
     * @notice Update pool
     * @param _poolId Pool id
     */
    function updatePool(uint256 _poolId) public {
        PoolInfo storage pool = pools[_poolId];

        uint256 totalAmount = pool.totalAmount;

        // Current reward balance
        uint256 currentRewardBalance = IERC20(pool.rewardToken).balanceOf(
            address(this)
        );

        if (currentRewardBalance == pool.lastRewardBalance || totalAmount == 0)
            return;

        // New reward received
        uint256 newReward = currentRewardBalance - pool.lastRewardBalance;

        pool.accRewardPerShare += (newReward * SCALE) / totalAmount;

        pool.lastRewardBalance = currentRewardBalance;

        emit PoolUpdated(_poolId, pool.accRewardPerShare);
    }

    function updateLastRewardBalance(uint256 _poolId) external onlyOwner {
        uint256 currentRewardBalance = IERC20(pools[_poolId].rewardToken)
            .balanceOf(address(this));
        pools[_poolId].lastRewardBalance = currentRewardBalance;
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Internal Functions ********************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Finish the reward token transfer
     * @dev Safe means not transfer exceeds the balance of contract
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
            revert("Insufficient balance for reward");
        } else {
            IERC20(_token).safeTransfer(_to, _amount);
            return _amount;
        }
    }
}
