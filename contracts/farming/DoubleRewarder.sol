// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.13;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interfaces/IFarmingPool.sol";


/**
 * @title Degis Double Rewarder Contract
 *
 * @notice This contract is used to distribute double reward tokens (from other projects)
 *
 *         PoolInfo is stored with the reward token address as the key
 *         E.g. Double reward for TraderJoe
 *         JoeAddress => PoolInfo
 *
 *         Except the "rewardToken" this is also "realRewardToken" for the pool
 *         - RewardToken is used for storing the info
 *         - RealRewardToken is used for transfering the reward
 *
 *         If realRewardToken is set as ZeroAddress, then rewardToken is used for transfering the reward
 *
 *         Reward claiming is only available when that pool is set to be “claimable"
 *         Before claimable, the reward is only calculated but not transfered
 *
 *         Typically, if multiple lp tokens are used for farming the same token reward,
 *         We need a mock address to represent the reward token
 *         E.g.
 *         - IM_CAI_10.0_L_1610 => CLY
 *             Reward token is CLY
 *             Real reward token is ZeroAddress
 *         - CAI_10.0_L_1610 => CLY
 *             Reward token is address(keccak256(abi.encodePacked("IM_CAI_10.0_L_1610", "CLY")))
 *             Real reward token is CLY
 *         - CAI_10.0_L_1612 => CLY
 *             Reward token is address(keccak256(abi.encodePacked("IM_CAI_10.0_L_1610", "CLY")))
 *             Real reward token is CLY
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
    // Reward token address => pool info
    mapping(address => PoolInfo) public pools;

    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
    }
    // User address => user info
    mapping(address => UserInfo) public userInfo;

    // User address => reward token address => pending reward
    mapping(address => mapping(address => uint256)) public userPendingReward;

    // Reward token address => claimable
    mapping(address => bool) public claimable;

    // Reward token address => Real reward token address
    // Some double reward farming start before the real reward token is deployed
    // So user get pending reward for the reward token address but they get real reward token when they claim the reward
    mapping(address => address) public realRewardToken;

    // User address
    mapping(address => mapping(address => UserInfo)) public newUserInfo;

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

    // ---------------------------------------------------------------------------------------- //
    // ************************************ View Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

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
        returns (uint256 pending)
    {
        require(pools[_token].lastRewardTimestamp > 0, "Non exist pool");

        PoolInfo memory pool = pools[_token];
        UserInfo memory user = newUserInfo[_user][_token];

        uint256 accTokenPerShare = pool.accTokenPerShare;

        uint256 lpSupply = IERC20(pool.lpToken).balanceOf(address(farmingPool));

        // If still distributing reward
        if (pool.rewardPerSecond > 0) {
            if (block.timestamp > pool.lastRewardTimestamp && lpSupply > 0) {
                uint256 timeElapsed = block.timestamp -
                    pool.lastRewardTimestamp;

                uint256 tokenReward = timeElapsed * pool.rewardPerSecond;

                accTokenPerShare += (tokenReward * SCALE) / lpSupply;
            }
        }

        pending = ((user.amount * accTokenPerShare) / SCALE) - user.rewardDebt;
    }

    /**
     * @notice Get mock reward token address
     *
     *         E.g. lpToken = IM_CAI  realRewardToken = CAI
     *         mockAddress = address(keccak256(abi.encodePacked(IM_CAI_LP, CAI)))
     *
     *
     * @param _lpToken         LP token address
     * @param _realRewardToken Real reward token address
     *
     * @return mockRewardToken Mock reward token address
     */
    function getMockRewardToken(address _lpToken, address _realRewardToken)
        public
        pure
        returns (address mockRewardToken)
    {
        mockRewardToken = address(
            uint160(
                uint256(keccak256(abi.encodePacked(_lpToken, _realRewardToken)))
            )
        );
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Set Functions ************************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Set reward speed for a pool
     *
     * @param _lpToken     LP token address
     * @param _rewardToken Reward token address (real)
     * @param _reward      Reward per second
     */
    function setRewardSpeed(
        address _lpToken,
        address _rewardToken,
        uint256 _reward
    ) external onlyOwner {
        uint256 lpSupply = IERC20(_lpToken).balanceOf(address(farmingPool));

        address mockRewardToken = getMockRewardToken(_lpToken, _rewardToken);

        updatePool(mockRewardToken, lpSupply);

        emit RewardRateUpdated(pools[mockRewardToken].rewardPerSecond, _reward);

        pools[mockRewardToken].rewardPerSecond = _reward;
    }

    /**
     * @notice Add a new reward token
     *
     * @param _rewardToken Reward token address (mock)
     * @param _lpToken     LP token address
     */
    function addRewardToken(address _rewardToken, address _lpToken)
        public
        onlyOwner
    {
        require(pools[_rewardToken].lastRewardTimestamp == 0, "Already exist");

        supportedRewardToken[_rewardToken] = true;

        pools[_rewardToken].lpToken = _lpToken;
        pools[_rewardToken].lastRewardTimestamp = block.timestamp;

        emit NewRewardTokenAdded(_rewardToken);
    }

    /**
     * @notice Add a new reward token but with mocked address
     *
     * @param _lpToken         LP token address used for double farming
     * @param _realRewardToken Real reward token address
     */
    function addRewardTokenWithMock(address _lpToken, address _realRewardToken)
        external
        onlyOwner
    {
        // Unique mock reward token address
        address mockRewardToken = getMockRewardToken(
            _lpToken,
            _realRewardToken
        );

        addRewardToken(mockRewardToken, _lpToken);
        realRewardToken[mockRewardToken] = _realRewardToken;
    }

    /**
     * @notice Make a reward token claimable
     *         If the token has been deployed when the farming start,
     *         then the real reward token should be address(0)
     *
     *         Mock reward address should match the real reward address
     *
     * @param _rewardToken     Reward token address (mock)
     * @param _realRewardToken Real reward token adedress
     */
    function setClaimable(address _rewardToken, address _realRewardToken)
        external
        onlyOwner
    {
        require(realRewardToken[_rewardToken] == _realRewardToken, "Invalid");

        claimable[_rewardToken] = true;

        emit RewardClaimable(_rewardToken);
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Update double reward pool
     *
     * @param _rewardToken Reward token address
     * @param _lpSupply    LP token balance of farming pool
     */
    function updatePool(address _rewardToken, uint256 _lpSupply) internal {
        PoolInfo storage pool = pools[_rewardToken];

        if (pool.rewardPerSecond > 0) {
            if (block.timestamp > pool.lastRewardTimestamp && _lpSupply > 0) {
                uint256 timeElapsed = block.timestamp -
                    pool.lastRewardTimestamp;

                uint256 tokenReward = timeElapsed * pool.rewardPerSecond;

                pool.accTokenPerShare += (tokenReward * SCALE) / _lpSupply;
            }
        }

        pool.lastRewardTimestamp = block.timestamp;
    }

    /**
     * @notice Distribute reward when user get reward in farming pool
     *         User lpAmount will be updated here
     *
     * @param _lpToken     LP token address
     * @param _rewardToken Reward token address
     * @param _user        User address
     * @param _lpAmount    LP amount of user
     * @param _lpSupply    LP token balance of farming pool
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
        UserInfo storage user = newUserInfo[_user][_rewardToken];

        // Get pending reward
        uint256 pending = (user.amount * pool.accTokenPerShare) /
            SCALE -
            user.rewardDebt;

        uint256 prevAmount = user.amount;

        // Effects before interactions to prevent re-entrancy
        user.amount = _lpAmount;

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
     * @param _rewardToken Reward token address (mock)
     */
    function claim(address _rewardToken) external supported(_rewardToken) {
        require(claimable[_rewardToken], "Not claimable");

        uint256 pending = userPendingReward[msg.sender][_rewardToken];

        // If this reward token need another address as real reward token
        address realRewardTokenAddress = realRewardToken[_rewardToken] ==
            address(0)
            ? _rewardToken
            : realRewardToken[_rewardToken];

        uint256 actualAmount = _safeRewardTransfer(
            realRewardTokenAddress,
            msg.sender,
            pending
        );

        // Only record those reward really been transferred
        userPendingReward[msg.sender][_rewardToken] -= actualAmount;

        emit ClaimReward(_rewardToken, msg.sender, actualAmount);
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Internal Functions ********************************* //
    // ---------------------------------------------------------------------------------------- //

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
}
