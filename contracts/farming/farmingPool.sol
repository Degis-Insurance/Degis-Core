// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../libraries/SafePRBMath.sol";

import "../utils/Ownable.sol";

import "../tokens/interfaces/IDegisToken.sol";

/**
 * @title  Farming Pool
 * @notice This contract is similar to MasterChef
 * @dev    The pool id starts from 1 not 0
 */
contract FarmingPool is Ownable {
    using SafePRBMath for uint256;
    using SafeERC20 for IERC20;
    using SafeERC20 for IDegisToken;

    // PoolId starts from 1
    uint256 public _nextPoolId;

    struct PoolInfo {
        address lpToken;
        uint256 degisPerBlock;
        uint256 lastRewardBlock;
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
    }
    // poolId => userAddress => userInfo
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;

    // The reward token is degis
    IDegisToken public degis;

    uint256 public startBlock; // Farming starts from a certain block number

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Events ***************************************** //
    // ---------------------------------------------------------------------------------------- //

    event Stake(address _staker, uint256 _poolId, uint256 _amount);
    event Withdraw(address _staker, uint256 _poolId, uint256 _amount);
    event Harvest(
        address _staker,
        address _rewardReceiver,
        uint256 _poolId,
        uint256 _pendingReward
    );
    event NewPoolAdded(address _lpToken);
    event RestartFarmingPool(uint256 _poolId, uint256 _blockNumber);
    event StopFarmingPool(uint256 _poolId, uint256 _blockNumber);
    event PoolUpdated(uint256 _poolId);

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //

    constructor(address _degis) {
        degis = IDegisToken(_degis);

        // Start from 1
        _nextPoolId = 1;

        // Manually fit the poolList[0] to avoid potential misleading
        poolList.push(
            PoolInfo({
                lpToken: address(0),
                degisPerBlock: 0,
                lastRewardBlock: 0,
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
        require(_address != address(0), "the address can not be zero address");
        _;
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** View Functions ************************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Check the amount of pending degis reward
     * @param _poolId PoolId of this farming pool
     * @param _userAddress User address
     * @return pendingDegisAmount Amount of pending degis
     */
    function pendingDegis(uint256 _poolId, address _userAddress)
        public
        view
        notZeroAddress(_userAddress)
        returns (uint256)
    {
        PoolInfo storage poolInfo = poolList[_poolId];

        if (block.number < poolInfo.lastRewardBlock) return 0;

        UserInfo storage user = userInfo[_poolId][_userAddress];

        uint256 lp_balance = IERC20(poolInfo.lpToken).balanceOf(address(this));

        uint256 accDegisPerShare = poolInfo.accDegisPerShare;

        if (lp_balance > 0) {
            // Deigs amount given to this pool
            uint256 blocks = block.number - poolInfo.lastRewardBlock;
            uint256 degisReward = poolInfo.degisPerBlock * blocks;

            // Update accDegisPerShare
            accDegisPerShare += degisReward.div(lp_balance);

            uint256 pending = user.stakingBalance.mul(accDegisPerShare) -
                user.rewardDebt;
            return pending;
        } else {
            return 0;
        }
    }

    /**
     * @notice Get the total pool list
     */
    function getPoolList() external view returns (PoolInfo[] memory) {
        return poolList;
    }

    /**
     * @notice Get user balance
     * @param _poolId Id of the pool
     * @param _userAddress Address of the user
     * @return _balance User's balance (lpToken)
     */
    function getUserBalance(uint256 _poolId, address _userAddress)
        external
        view
        returns (uint256 _balance)
    {
        return userInfo[_poolId][_userAddress].stakingBalance;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Set Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Set the start block number
     * @param _startBlock New start block number
     */
    function setStartBlock(uint256 _startBlock) external onlyOwner {
        startBlock = _startBlock;
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Main Functions ************************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Add a new lp to the pool. Can only be called by the owner.
     * @param _lpToken LP token address
     * @param _degisPerBlock Reward distribution per block for this new pool
     * @param _withUpdate Whether update all pools' status
     */
    function add(
        address _lpToken,
        uint256 _degisPerBlock,
        bool _withUpdate
    ) public notZeroAddress(_lpToken) onlyOwner {
        // Check if already exists, if the poolId is 0, that means not in the pool
        bool isInPool = _alreadyInPool(_lpToken);

        require(isInPool, "This lptoken is already in the farming pool");

        if (_withUpdate) {
            massUpdatePools();
        }

        uint256 lastRewardBlock = block.number > startBlock
            ? block.number
            : startBlock;

        // Push this new pool into the list
        poolList.push(
            PoolInfo({
                lpToken: _lpToken,
                degisPerBlock: _degisPerBlock,
                lastRewardBlock: lastRewardBlock,
                accDegisPerShare: 0
            })
        );

        // Store the poolId and set the farming status to true
        poolMapping[_lpToken] = _nextPoolId;
        isFarming[_nextPoolId] = true;

        _nextPoolId += 1;

        emit NewPoolAdded(_lpToken);
    }

    /**
     * @notice Update the degisPerBlock for a specific pool (set to 0 to stop farming)
     * @param _poolId Id of the farming pool
     * @param _degisPerBlock New reward amount per block
     * @param _withUpdate Whether update all the pool
     */
    function setDegisReward(
        uint256 _poolId,
        uint256 _degisPerBlock,
        bool _withUpdate
    ) public onlyOwner {
        // Ensure there already exists this pool
        require(
            poolList[_poolId].lastRewardBlock != 0,
            "no such pool, your poolId may be wrong"
        );
        if (_withUpdate) {
            massUpdatePools();
        }

        if (isFarming[_poolId] == false && _degisPerBlock > 0) {
            isFarming[_poolId] = true;
            emit RestartFarmingPool(_poolId, block.number);
        }

        if (_degisPerBlock == 0) {
            isFarming[_poolId] = false;
            emit StopFarmingPool(_poolId, block.number);
        }
        poolList[_poolId].degisPerBlock = _degisPerBlock;
    }

    /**
     * @notice Stake LP token into the farming pool
     * @param _poolId Id of the farming pool
     * @param _amount Staking amount
     */
    function stake(uint256 _poolId, uint256 _amount) public {
        PoolInfo storage pool = poolList[_poolId];
        UserInfo storage user = userInfo[_poolId][msg.sender];

        // Must update first!!
        updatePool(_poolId);

        if (user.stakingBalance > 0) {
            uint256 pending = user.stakingBalance.mul(pool.accDegisPerShare) -
                user.rewardDebt;

            safeDegisTransfer(msg.sender, pending);
        }

        // Approve
        IERC20(pool.lpToken).safeTransferFrom(
            address(msg.sender),
            address(this),
            _amount
        );

        user.stakingBalance += _amount;
        user.rewardDebt = user.stakingBalance.mul(pool.accDegisPerShare);

        emit Stake(msg.sender, _poolId, _amount);
    }

    /**
     * @notice Withdraw lptoken from the pool
     * @param _poolId Id of the farming pool
     * @param _amount Amount of lp tokens to withdraw
     */
    function withdraw(uint256 _poolId, uint256 _amount) public {
        PoolInfo storage pool = poolList[_poolId];
        UserInfo storage user = userInfo[_poolId][msg.sender];

        require(user.stakingBalance >= _amount, "not enough balance");

        updatePool(_poolId);

        uint256 pending = user.stakingBalance.mul(pool.accDegisPerShare) -
            user.rewardDebt;

        safeDegisTransfer(msg.sender, pending);

        user.stakingBalance -= _amount;
        user.rewardDebt = user.stakingBalance.mul(pool.accDegisPerShare);

        IERC20(pool.lpToken).safeTransfer(address(msg.sender), _amount);

        emit Withdraw(msg.sender, _poolId, _amount);
    }

    /**
     * @notice Update the pool's reward status
     * @param _poolId Id of the farming pool
     */
    function updatePool(uint256 _poolId) public {
        PoolInfo storage pool = poolList[_poolId];
        if (block.number <= pool.lastRewardBlock) {
            return;
        }

        uint256 lpSupply = IERC20(pool.lpToken).balanceOf(address(this));
        if (lpSupply == 0) {
            pool.lastRewardBlock = block.number;
            return;
        }

        uint256 blocks = block.number - pool.lastRewardBlock;
        uint256 degisReward = blocks * pool.degisPerBlock;

        // Don't forget to set the farming pool as minter
        degis.mintDegis(address(this), degisReward);

        pool.accDegisPerShare += degisReward.div(lpSupply);
        pool.lastRewardBlock = block.number;

        emit PoolUpdated(_poolId);
    }

    /**
     * @notice Harvest the degis reward and can be sent to another address
     * @param _poolId: Id of the farming pool
     * @param _to Receiver of degis rewards.
     */
    function harvest(uint256 _poolId, address _to) public {
        updatePool(_poolId);
        PoolInfo memory pool = poolList[_poolId];
        UserInfo storage user = userInfo[_poolId][msg.sender];

        uint256 pendingReward = user.stakingBalance.mul(pool.accDegisPerShare) -
            user.rewardDebt;

        // Effects
        user.rewardDebt = user.stakingBalance.mul(pool.accDegisPerShare);

        // Interactions
        if (pendingReward != 0) {
            degis.safeTransfer(_to, pendingReward);
        }

        emit Harvest(msg.sender, _to, _poolId, pendingReward);
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
     * @dev This can be written as a modifier, I just want to test the error form
     * @param _lpTokenAddress LP token address
     * @return _isInPool Wether this lp already in pool
     */
    function _alreadyInPool(address _lpTokenAddress)
        internal
        view
        returns (bool _isInPool)
    {
        uint256 poolId = poolMapping[_lpTokenAddress];
        // Never been added
        if (poolId == 0) _isInPool = false;
        else _isInPool = true;
    }

    /**
     * @notice Safe degis transfer (check if the pool has enough DEGIS token)
     * @param _to User's address
     * @param _amount Amount to transfer
     */
    function safeDegisTransfer(address _to, uint256 _amount) internal {
        uint256 DegisBalance = degis.balanceOf(address(this));
        if (_amount > DegisBalance) {
            degis.transfer(_to, DegisBalance);
        } else {
            degis.transfer(_to, _amount);
        }
    }
}
