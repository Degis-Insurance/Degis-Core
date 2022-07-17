// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.13;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interfaces/IFarmingPool.sol";

import "hardhat/console.sol";

/**
 * @title Degis Double Rewarder Contract
 *
 * @notice
 *
 *
 *
 *
 */

contract DoubleRewarder is OwnableUpgradeable {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constants **************************************** //
    // ---------------------------------------------------------------------------------------- //

    uint256 private constant SCALE = 1e12;

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Variables **************************************** //
    // ---------------------------------------------------------------------------------------- //

    IFarmingPool public farmingPool;

    mapping(address => bool) public supportedRewardToken;

    struct PoolInfo {
        address lpToken;
        uint256 rewardPerSecond;
        uint256 accTokenPerShare;
        uint256 lastRewardTimestamp;
    }

    /// @notice Info of the poolInfo.
    mapping(address => PoolInfo) public pools;

    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
    }
    /// @notice Info of each user that stakes LP tokens.
    mapping(address => UserInfo) public userInfo;

    // User address => reward token address => pending reward
    mapping(address => mapping(address => uint256)) public userPendingReward;

    // Reward token address => claimable
    mapping(address => bool) public claimable;

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Events ***************************************** //
    // ---------------------------------------------------------------------------------------- //

    event DistributeReward(address user, uint256 amount);

    event NewRewardTokenAdded(address rewardToken);

    event RewardRateUpdated(uint256 oldRate, uint256 newRate);

    event RewardClaimable(address rewardToken);

    event ClaimReward(address rewardToken, address user, uint256 amount);

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
    function initialize(address _farmingPool) public initializer {
        __Ownable_init();
        farmingPool = IFarmingPool(_farmingPool);
    }

    /**
     * @notice Make a reward token claimable
     */
    function setClaimable(address _rewardToken) external onlyOwner {
        claimable[_rewardToken] = true;

        emit RewardClaimable(_rewardToken);
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

        uint256 lpSupply = IERC20(pool.lpToken).balanceOf(address(farmingPool));

        if (block.timestamp > pool.lastRewardTimestamp && lpSupply != 0) {
            uint256 timeElapsed = block.timestamp - pool.lastRewardTimestamp;

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
    function updatePool(address _rewardToken, uint256 _lpSupply)
        public
        supported(_rewardToken)
    {
        PoolInfo storage pool = pools[_rewardToken];

        if (block.timestamp > pool.lastRewardTimestamp) {
            if (_lpSupply > 0) {
                uint256 timeElapsed = block.timestamp -
                    pool.lastRewardTimestamp;

                uint256 tokenReward = timeElapsed * pool.rewardPerSecond;

                pool.accTokenPerShare += (tokenReward * SCALE) / _lpSupply;
            }

            pool.lastRewardTimestamp = block.timestamp;
        }
    }

    /**
     * @notice Set reward speed for a pool
     *
     * @param _lpToken       LP token address
     * @param _rewardToken   Reward token address
     * @param _reward        Reward per second
     */
    function setRewardSpeed(
        address _lpToken,
        address _rewardToken,
        uint256 _reward
    ) external supported(_rewardToken) onlyOwner {
        uint256 lpSupply = IERC20(_lpToken).balanceOf(address(farmingPool));
        updatePool(_rewardToken, lpSupply);

        emit RewardRateUpdated(pools[_rewardToken].rewardPerSecond, _reward);

        pools[_rewardToken].rewardPerSecond = _reward;
    }

    /**
     * @notice Add a new reward token
     *
     * @param _rewardToken Reward token address
     * @param _lpToken     LP token address
     */
    function addRewardToken(address _rewardToken, address _lpToken)
        external
        onlyOwner
    {
        require(pools[_rewardToken].lastRewardTimestamp == 0, "Already exist");

        supportedRewardToken[_rewardToken] = true;

        pools[_rewardToken].lpToken = _lpToken;

        emit NewRewardTokenAdded(_rewardToken);
    }

    /**
     * @notice Distribute reward when user get reward in farming pool
     *         User lpAmount will be updated here
     *
     * @param _lpToken     LP token address
     * @param _rewardToken Reward token address
     * @param _user        User address
     * @param _lpAmount    LP amount of user
     */
    function distributeReward(
        address _lpToken,
        address _rewardToken,
        address _user,
        uint256 _lpAmount,
        uint256 _lpSupply
    ) external onlyFarmingPool supported(_rewardToken) {
        require(pools[_rewardToken].lpToken == _lpToken, "Not match");

        updatePool(_rewardToken, _lpSupply);

        PoolInfo memory pool = pools[_rewardToken];
        UserInfo storage user = userInfo[_user];

        console.log("user amount", user.amount);

        // Get pending reward
        uint256 pending = (user.amount * pool.accTokenPerShare) /
            SCALE -
            user.rewardDebt;

        uint256 prevAmount = user.amount;

        // Effects before interactions to prevent re-entrancy
        user.amount = _lpAmount;

        console.log("user amount after", user.amount);

        user.rewardDebt = (_lpAmount * pool.accTokenPerShare) / SCALE;

        if (prevAmount > 0) {
            // uint256 actualReward = _safeRewardTransfer(
            //     _rewardToken,
            //     _user,
            //     pending
            // );

            // Record the reward and distribute later
            userPendingReward[_user][_rewardToken] += pending;

            emit DistributeReward(_user, pending);
        }
    }

    /**
     * @notice Claim pending reward
     *         During IDO protection, the insured token have not been issued yet
     *         So we need to claim the pending reward later (after the farming)
     *
     * @param _rewardToken Reward token address
     */
    function claim(address _rewardToken) external supported(_rewardToken) {
        require(claimable[_rewardToken], "Not claimable");

        uint256 pending = userPendingReward[msg.sender][_rewardToken];

        uint256 actualAmount = _safeRewardTransfer(
            _rewardToken,
            msg.sender,
            pending
        );

        // Only record those reward really been transferred
        userPendingReward[msg.sender][_rewardToken] -= actualAmount;

        emit ClaimReward(_rewardToken, msg.sender, actualAmount);
    }

    /**
     * @notice Safe degis transfer (check if the pool has enough DEGIS token)
     *
     * @param _to     User address
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

    function clearRewardDebt(address user) external onlyOwner {
        userInfo[user].rewardDebt = 0;
    }
}
