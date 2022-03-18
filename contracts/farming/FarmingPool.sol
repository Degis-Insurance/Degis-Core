// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../utils/OwnableWithoutContext.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "../tokens/interfaces/IDegisToken.sol";

/**
 * @title  Farming Pool
 * @notice This contract is for LPToken mining on Degis
 * @dev    The pool id starts from 1 rather than 0
 *         The degis reward is calculated by timestamp rather than block number
 */
contract FarmingPool is OwnableWithoutContext, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using SafeERC20 for IDegisToken;

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Variables **************************************** //
    // ---------------------------------------------------------------------------------------- //

    // The reward token is degis
    IDegisToken public degis;

    uint256 public constant SCALE = 1e12;

    // PoolId starts from 1
    uint256 public _nextPoolId;

    // Farming starts from a certain block timestamp
    // To keep the same with naughty price pools, we change from block numbers to timestamps
    uint256 public startTimestamp;

    struct PoolInfo {
        address lpToken;
        uint256 degisPerSecond;
        uint256 lastRewardTimestamp;
        uint256 accDegisPerShare;
    }
    PoolInfo[] public poolList;

    // lptoken address => poolId
    mapping(address => uint256) public poolMapping;

    // poolId => alreadyFarming
    mapping(uint256 => bool) public isFarming;

    struct UserInfo {
        uint256 rewardDebt; // degis reward debt
        uint256 stakingBalance; // the amount of a user's staking in the pool
        uint256 bonus; // user bonus point 
    }
    // poolId => userAddress => userInfo
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Events ***************************************** //
    // ---------------------------------------------------------------------------------------- //
    event StartTimestampChanged(uint256 startTimestamp);
    event Stake(address staker, uint256 poolId, uint256 amount);
    event Withdraw(address staker, uint256 poolId, uint256 amount);
    event Harvest(
        address staker,
        address rewardReceiver,
        uint256 poolId,
        uint256 pendingReward
    );
    event HarvestAndCompound(
        address staker,
        uint256 poolId,
        uint256 pendingReward
    );
    event NewPoolAdded(address lpToken, uint256 degisPerSecond);
    event FarmingPoolStarted(uint256 poolId, uint256 timestamp);
    event FarmingPoolStopped(uint256 poolId, uint256 timestamp);
    event DegisRewardChanged(uint256 poolId, uint256 degisPerSecond);
    event PoolUpdated(uint256 poolId);

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //

    constructor(address _degis) OwnableWithoutContext(msg.sender) {
        degis = IDegisToken(_degis);

        // Start from 1
        _nextPoolId = 1;

        poolList.push(
            PoolInfo({
                lpToken: address(0),
                degisPerSecond: 0,
                lastRewardTimestamp: 0,
                accDegisPerShare: 0
            })
        );
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************** Modifiers *************************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice The address can not be zero
     */
    modifier notZeroAddress(address _address) {
        require(_address != address(0), "Zero address");
        _;
    }

    /**
     * @notice The pool is still in farming
     */
    modifier stillFarming(uint256 _poolId) {
        require(isFarming[_poolId], "Pool is not farming");
        _;
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** View Functions ************************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Check the amount of pending degis reward
     * @param _poolId PoolId of this farming pool
     * @param _user User address
     * @return pendingDegisAmount Amount of pending degis
     */
    function pendingDegis(uint256 _poolId, address _user)
        external
        view
        returns (uint256)
    {
        PoolInfo memory poolInfo = poolList[_poolId];

        if (
            poolInfo.lastRewardTimestamp == 0 ||
            block.timestamp < poolInfo.lastRewardTimestamp ||
            block.timestamp < startTimestamp
        ) return 0;

        UserInfo memory user = userInfo[_poolId][_user];

        // Total lp token balance
        uint256 lp_balance = IERC20(poolInfo.lpToken).balanceOf(address(this));

        uint256 accDegisPerShare = poolInfo.accDegisPerShare;

        if (lp_balance == 0) return 0;
        else {
            // If the pool is still farming, update the info
            if (isFarming[_poolId]) {
                // Deigs amount given to this pool
                uint256 timePassed = block.timestamp -
                    poolInfo.lastRewardTimestamp;
                uint256 degisReward = poolInfo.degisPerSecond * timePassed;

                // Update accDegisPerShare
                // LPToken may have different decimals
                accDegisPerShare += (degisReward * SCALE) / lp_balance;
            }

            // If the pool has stopped, not update the info
            uint256 pending = (user.stakingBalance * accDegisPerShare) /
                SCALE -
                user.rewardDebt;

            return pending;
        }
    }

    /**
     * @notice Get the total pool list
     * @return pooList Total pool list
     */
    function getPoolList() external view returns (PoolInfo[] memory) {
        return poolList;
    }

    /**
     * @notice Get a user's balance
     * @param _poolId Id of the pool
     * @param _user User address
     * @return balance User's balance (lpToken)
     */
    function getUserBalance(uint256 _poolId, address _user)
        external
        view
        returns (uint256)
    {
        return userInfo[_poolId][_user].stakingBalance;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Set Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Set the start block timestamp
     * @param _startTimestamp New start block timestamp
     */
    function setStartTimestamp(uint256 _startTimestamp)
        external
        onlyOwner
        whenNotPaused
    {
        // Can only be set before any pool is added
        require(
            _nextPoolId == 1,
            "Can not set start timestamp after adding a pool"
        );

        startTimestamp = _startTimestamp;
        emit StartTimestampChanged(_startTimestamp);
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Main Functions ************************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Add a new lp to the pool
     * @dev Can only be called by the owner
     * @param _lpToken LP token address
     * @param _degisPerSecond Reward distribution per second for this new pool
     * @param _withUpdate Whether update all pools' status
     */
    function add(
        address _lpToken,
        uint256 _degisPerSecond,
        bool _withUpdate
    ) public notZeroAddress(_lpToken) onlyOwner whenNotPaused {
        // Check if already exists, if the poolId is 0, that means not in the pool
        require(
            !_alreadyInPool(_lpToken),
            "This lptoken is already in the farming pool"
        );

        if (_withUpdate) {
            massUpdatePools();
        }

        uint256 lastRewardTimestamp = block.timestamp > startTimestamp
            ? block.timestamp
            : startTimestamp;

        // Push this new pool into the list
        poolList.push(
            PoolInfo({
                lpToken: _lpToken,
                degisPerSecond: _degisPerSecond,
                lastRewardTimestamp: lastRewardTimestamp,
                accDegisPerShare: 0
            })
        );

        // Store the poolId and set the farming status to true
        if (_degisPerSecond > 0) isFarming[_nextPoolId] = true;

        poolMapping[_lpToken] = _nextPoolId++;

        emit NewPoolAdded(_lpToken, _degisPerSecond);
    }

    /**
     * @notice Update the degisPerSecond for a specific pool (set to 0 to stop farming)
     * @param _poolId Id of the farming pool
     * @param _degisPerSecond New reward amount per block
     * @param _withUpdate Whether update all the pool
     */
    function setDegisReward(
        uint256 _poolId,
        uint256 _degisPerSecond,
        bool _withUpdate
    ) public onlyOwner whenNotPaused {
        // Ensure there already exists this pool
        require(poolList[_poolId].lastRewardTimestamp != 0, "Pool not exists");

        if (_withUpdate) massUpdatePools();
        else updatePool(_poolId);

        // Not farming now + reward > 0 => Restart
        if (isFarming[_poolId] == false && _degisPerSecond > 0) {
            isFarming[_poolId] = true;
            emit FarmingPoolStarted(_poolId, block.timestamp);
        }

        if (_degisPerSecond == 0) {
            isFarming[_poolId] = false;
            emit FarmingPoolStopped(_poolId, block.timestamp);
        } else {
            poolList[_poolId].degisPerSecond = _degisPerSecond;
            emit DegisRewardChanged(_poolId, _degisPerSecond);
        }
    }

    /**
     * @notice Stake LP token into the farming pool
     * @dev Can only stake to the pools that are still farming
     * @param _poolId Id of the farming pool
     * @param _amount Staking amount
     */
    function stake(uint256 _poolId, uint256 _amount)
        public
        nonReentrant
        whenNotPaused
        stillFarming(_poolId)
    {
        require(_amount > 0, "Can not stake zero");

        PoolInfo storage pool = poolList[_poolId];
        UserInfo storage user = userInfo[_poolId][msg.sender];

        // Must update first
        updatePool(_poolId);

        // First distribute the reward if exists
        if (user.stakingBalance > 0) {
            uint256 pending = (user.stakingBalance * pool.accDegisPerShare) /
                SCALE -
                user.rewardDebt;

            // Real reward amount
            uint256 reward = _safeDegisTransfer(msg.sender, pending);
            emit Harvest(msg.sender, msg.sender, _poolId, reward);
        }

        // Actual deposit amount
        uint256 actualAmount = _safeLPTransfer(
            false,
            pool.lpToken,
            msg.sender,
            _amount
        );

        user.stakingBalance += actualAmount;
        user.rewardDebt = (user.stakingBalance * pool.accDegisPerShare) / SCALE;

        emit Stake(msg.sender, _poolId, actualAmount);
    }

    /**
     * @notice Withdraw lptoken from the pool
     * @param _poolId Id of the farming pool
     * @param _amount Amount of lp tokens to withdraw
     */
    function withdraw(uint256 _poolId, uint256 _amount)
        public
        nonReentrant
        whenNotPaused
    {
        require(_amount > 0, "Zero amount");

        PoolInfo storage pool = poolList[_poolId];
        UserInfo storage user = userInfo[_poolId][msg.sender];

        require(user.stakingBalance >= _amount, "Not enough stakingBalance");

        // Update if the pool is still farming
        // Users can withdraw even after the pool stopped
        if (isFarming[_poolId]) updatePool(_poolId);

        uint256 pending = (user.stakingBalance * pool.accDegisPerShare) /
            SCALE -
            user.rewardDebt;

        uint256 reward = _safeDegisTransfer(msg.sender, pending);
        emit Harvest(msg.sender, msg.sender, _poolId, reward);

        user.stakingBalance -= _amount;
        user.rewardDebt = (user.stakingBalance * pool.accDegisPerShare) / SCALE;

        uint256 actualAmount = _safeLPTransfer(
            true,
            pool.lpToken,
            msg.sender,
            _amount
        );

        emit Withdraw(msg.sender, _poolId, actualAmount);
    }

    /**
     * @notice Harvest the degis reward and can be sent to another address
     * @param _poolId Id of the farming pool
     * @param _to Receiver of degis rewards
     */
    function harvest(uint256 _poolId, address _to)
        public
        nonReentrant
        whenNotPaused
    {
        // Only update the pool when it is still in farming
        if (isFarming[_poolId]) updatePool(_poolId);

        PoolInfo memory pool = poolList[_poolId];
        UserInfo storage user = userInfo[_poolId][msg.sender];

        uint256 pendingReward = (user.stakingBalance * pool.accDegisPerShare) /
            SCALE -
            user.rewardDebt;

        // Effects
        user.rewardDebt = (user.stakingBalance * pool.accDegisPerShare) / SCALE;

        // Interactions
        if (pendingReward != 0) {
            degis.safeTransfer(_to, pendingReward);
        }

        emit Harvest(msg.sender, _to, _poolId, pendingReward);
    }

    /**
     * @notice Update the pool's reward status
     * @param _poolId Id of the farming pool
     */
    function updatePool(uint256 _poolId) public {
        PoolInfo storage pool = poolList[_poolId];
        if (block.timestamp <= pool.lastRewardTimestamp) {
            return;
        }

        uint256 lpSupply = IERC20(pool.lpToken).balanceOf(address(this));

        // No LP deposited, then just update the lastRewardTimestamp
        if (lpSupply == 0) {
            pool.lastRewardTimestamp = block.timestamp;
            return;
        }

        uint256 timePassed = block.timestamp - pool.lastRewardTimestamp;
        uint256 degisReward = timePassed * pool.degisPerSecond;

        // Don't forget to set the farming pool as minter
        degis.mintDegis(address(this), degisReward);

        pool.accDegisPerShare += (degisReward * SCALE) / lpSupply;

        pool.lastRewardTimestamp = block.timestamp;

        emit PoolUpdated(_poolId);
    }

    /**
     * @notice Update all farming pools (except for those stopped ones)
     */
    function massUpdatePools() public {
        uint256 length = poolList.length;
        for (uint256 poolId = 0; poolId < length; poolId++) {
            if (isFarming[poolId] == false) continue;
            else updatePool(poolId);
        }
    }

    // ---------------------------------------------------------------------------------------- //
    // ********************************** Internal Functions ********************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Check if a lptoken has been added into the pool before
     * @dev This can also be written as a modifier
     * @param _lpToken LP token address
     * @return _isInPool Wether this lp is already in pool
     */
    function _alreadyInPool(address _lpToken)
        internal
        view
        returns (bool _isInPool)
    {
        uint256 poolId = poolMapping[_lpToken];

        _isInPool = (poolId != 0) ? true : false;
    }

    /**
     * @notice Safe degis transfer (check if the pool has enough DEGIS token)
     * @param _to User's address
     * @param _amount Amount to transfer
     */
    function _safeDegisTransfer(address _to, uint256 _amount)
        internal
        returns (uint256)
    {
        uint256 poolDegisBalance = degis.balanceOf(address(this));
        require(poolDegisBalance > 0, "No Degis token in the pool");

        if (_amount > poolDegisBalance) {
            degis.safeTransfer(_to, poolDegisBalance);
            return (poolDegisBalance);
        } else {
            degis.safeTransfer(_to, _amount);
            return _amount;
        }
    }

    /**
     * @notice Finish the transfer of LP Token
     * @dev The lp token may have loss during transfer
     * @param _out Whether the lp token is out
     * @param _lpToken LP token address
     * @param _user User address
     * @param _amount Amount of lp tokens
     */
    function _safeLPTransfer(
        bool _out,
        address _lpToken,
        address _user,
        uint256 _amount
    ) internal returns (uint256) {
        uint256 poolBalanceBefore = IERC20(_lpToken).balanceOf(address(this));

        if (_out) IERC20(_lpToken).safeTransfer(_user, _amount);
        else IERC20(_lpToken).safeTransferFrom(_user, address(this), _amount);

        uint256 poolBalanceAfter = IERC20(_lpToken).balanceOf(address(this));

        return
            _out
                ? poolBalanceBefore - poolBalanceAfter
                : poolBalanceAfter - poolBalanceBefore;
    }
}
