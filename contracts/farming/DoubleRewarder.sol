// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interfaces/IFarmingPool.sol";

/**
 * @title Degis Double Rewarder Contract
 *
 * @notice
 *
 *
 *
 *
 */

// ---------------------------------------------------------------------------------------- //
// ************************************* Variables **************************************** //
// ---------------------------------------------------------------------------------------- //

// ---------------------------------------------------------------------------------------- //
// *************************************** Errors ***************************************** //
// ---------------------------------------------------------------------------------------- //
// ---------------------------------------------------------------------------------------- //
// ************************************* Constructor ************************************** //
// ---------------------------------------------------------------------------------------- //

// ---------------------------------------------------------------------------------------- //
// ************************************ View Functions ************************************ //
// ---------------------------------------------------------------------------------------- //
// ---------------------------------------------------------------------------------------- //
// ************************************ Set Functions ************************************* //
// ---------------------------------------------------------------------------------------- //
// ---------------------------------------------------------------------------------------- //
// ************************************ Main Functions ************************************ //
// ---------------------------------------------------------------------------------------- //
// ---------------------------------------------------------------------------------------- //
// *********************************** Internal Functions ********************************* //
// ---------------------------------------------------------------------------------------- //
contract DoubleRewarder is Ownable {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constants **************************************** //
    // ---------------------------------------------------------------------------------------- //

    uint256 private constant SCALE = 1e12;

    IFarmingPool public immutable farmingPool;

    mapping(address => bool) public supportedRewardToken;

    struct PoolInfo {
        uint256 rewardPerSecond;
        uint256 accTokenPerShare;
        uint256 lastRewardTimestamp;
    }

    /// @notice Info of the poolInfo.
    mapping(address => PoolInfo) pools;

    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
    }
    /// @notice Info of each user that stakes LP tokens.
    mapping(address => UserInfo) public userInfo;

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Events ***************************************** //
    // ---------------------------------------------------------------------------------------- //

    event DistributeReward(address user, uint256 amount);

    event NewRewardTokenAdded(address rewardToken);

    event RewardRateUpdated(uint256 oldRate, uint256 newRate);

    // ---------------------------------------------------------------------------------------- //
    // ************************************** Modifiers *************************************** //
    // ---------------------------------------------------------------------------------------- //

    modifier onlyFarmingPool() {
        require(msg.sender == address(farmingPool), "Only farmingPool");
        _;
    }

    modifier supported(address _token) {
        require(supportedRewardToken[_token], "Token not supported");
        _;
    }

    /**
     * @notice Constructor
     *         Only need to set farming pool address
     */
    constructor(IFarmingPool _pool) {
        farmingPool = _pool;
    }

    /**
     * @notice Get pending reward
     *
     * @param _token Reward token address
     * @param _user  User address
     *
     * @return pending Pending reward
     */
    function pendingReward(address _token, address _user)
        external
        view
        supported(_token)
        returns (uint256 pending)
    {
        require(pools[_token].lastRewardTimestamp > 0, "Non exist pool");

        PoolInfo memory pool = pools[_token];
        UserInfo storage user = userInfo[_user];

        uint256 accTokenPerShare = pool.accTokenPerShare;
        uint256 lpSupply = IERC20(_token).balanceOf(address(farmingPool));

        if (block.timestamp > pool.lastRewardTimestamp && lpSupply != 0) {
            uint256 timeElapsed = block.timestamp + pool.lastRewardTimestamp;

            uint256 tokenReward = timeElapsed * pool.rewardPerSecond;

            accTokenPerShare += (tokenReward * SCALE) / lpSupply;
        }

        pending = ((user.amount * accTokenPerShare) / SCALE) - user.rewardDebt;
    }

    /**
     * @notice Update double reward pool
     *
     * @param _rewardToken Reward token address
     */
    function updatePool(address _rewardToken) public supported(_rewardToken) {
        PoolInfo storage pool = pools[_rewardToken];

        if (block.timestamp > pool.lastRewardTimestamp) {
            uint256 lpSupply = IERC20(_rewardToken).balanceOf(
                address(farmingPool)
            );

            if (lpSupply > 0) {
                uint256 timeElapsed = block.timestamp -
                    pool.lastRewardTimestamp;

                uint256 tokenReward = timeElapsed * pool.rewardPerSecond;

                pool.accTokenPerShare += (tokenReward * SCALE) / lpSupply;
            }

            pool.lastRewardTimestamp = block.timestamp;
        }
    }

    /**
     * @notice Set reward speed for a pool
     *
     * @param _token  Reward token address
     * @param _reward Reward per second
     */
    function setRewardSpeed(address _token, uint256 _reward)
        external
        supported(_token)
        onlyOwner
    {
        updatePool(_token);

        emit RewardRateUpdated(pools[_token].rewardPerSecond, _reward);

        pools[_token].rewardPerSecond = _reward;
    }

    function addRewardToken(address _token) external onlyOwner {
        require(pools[_token].lastRewardTimestamp == 0, "Already exist");

        supportedRewardToken[_token] = true;

        emit NewRewardTokenAdded(_token);
    }

    /**
     * @notice Distribute reward when user get reward in farming pool
     *         User lpAmount will be updated here
     *
     * @param _token    Reward token address
     * @param _user     User address
     * @param _lpAmount LP amount of user
     */
    function distributeReward(
        address _token,
        address _user,
        uint256 _lpAmount
    ) external onlyFarmingPool supported(_token) {
        updatePool(_token);

        PoolInfo memory pool = pools[_token];
        UserInfo storage user = userInfo[_user];

        // Get pending reward
        uint256 pending = (user.amount * pool.accTokenPerShare) /
            SCALE -
            user.rewardDebt;

        uint256 prevAmount = user.amount;

        // Effects before interactions to prevent re-entrancy
        user.amount = _lpAmount;

        user.rewardDebt = (_lpAmount * pool.accTokenPerShare) / SCALE;

        if (prevAmount > 0) {
            uint256 actualReward = _safeRewardTransfer(_token, _user, pending);

            emit DistributeReward(_user, actualReward);
        }
    }

    /**
     * @notice Safe degis transfer (check if the pool has enough DEGIS token)
     * @param _to User's address
     * @param _amount Amount to transfer
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

    /**
     * @notice Withdraw tokens
     *         When stopping double reward, first set the reward speed, then withdraw tokens
     */
    function emergencyWithdraw(address _token) external onlyOwner {
        IERC20(_token).safeTransfer(
            address(msg.sender),
            IERC20(_token).balanceOf(address(this))
        );
    }
}
