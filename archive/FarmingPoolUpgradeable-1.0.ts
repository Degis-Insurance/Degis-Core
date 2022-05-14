// // SPDX-License-Identifier: GPL-3.0-or-later

// /*
//  //======================================================================\\
//  //======================================================================\\
//     *******         **********     ***********     *****     ***********
//     *      *        *              *                 *       *
//     *        *      *              *                 *       *
//     *         *     *              *                 *       *
//     *         *     *              *                 *       *
//     *         *     **********     *       *****     *       ***********
//     *         *     *              *         *       *                 *
//     *         *     *              *         *       *                 *
//     *        *      *              *         *       *                 *
//     *      *        *              *         *       *                 *
//     *******         **********     ***********     *****     ***********
//  \\======================================================================//
//  \\======================================================================//
// */
// pragma solidity ^0.8.10;

// import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
// import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
// import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
// import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
// import {IDegisToken} from "../tokens/interfaces/IDegisToken.sol";
// import {Math} from "../libraries/Math.sol";
// import {IVeDEG} from "../governance/interfaces/IVeDEG.sol";

// /**
//  * @title  Farming Pool
//  * @notice This contract is for LPToken mining on Degis
//  * @dev    The pool id starts from 1 rather than 0
//  *         The degis reward is calculated by timestamp rather than block number
//  *
//  *         VeDEG will boost the farming speed by having a extra reward type
//  *         The extra reward is shared by those staking lptokens with veDEG balances
//  *         Every time the veDEG balance change, the reward will be updated
//  *
//  *         The basic reward depends on the liquidity inside the pool
//  *         Update with a piecewise function
//  *         liquidity amount:   |---------------|------------------|----------------
//  *                             0           threshold 1        threshold 2
//  *          reward speed:            speed1          speed2             speed3
//  *
//  *         The speed update will be updated one tx after the last tx that triggers the threshold
//  *         The reward update will be another one tx later
//  */
// contract FarmingPoolUpgradeable is
//     Initializable,
//     OwnableUpgradeable,
//     ReentrancyGuardUpgradeable,
//     PausableUpgradeable
// {
//     using SafeERC20 for IERC20;
//     using SafeERC20 for IDegisToken;
//     using Math for uint256;

//     // ---------------------------------------------------------------------------------------- //
//     // ************************************* Variables **************************************** //
//     // ---------------------------------------------------------------------------------------- //

//     string public constant name = "Degis LP Farming Pool";

//     // The reward token is degis
//     IDegisToken public degis;

//     // The bonus reward depends on veDEG
//     IVeDEG public veDEG;

//     // SCALE/Precision used for calculating rewards
//     uint256 public constant SCALE = 1e12;

//     // PoolId starts from 1
//     uint256 public _nextPoolId;

//     // Farming starts from a certain block timestamp
//     // To keep the same with naughty price pools, we change from block numbers to timestamps
//     uint256 public startTimestamp;

//     struct PoolInfo {
//         address lpToken; // LPToken address
//         uint256 basicDegisPerSecond; // Basic Reward speed
//         uint256 bonusDegisPerSecond; // Bonus reward speed
//         uint256 lastRewardTimestamp; // Last reward timestamp
//         uint256 accDegisPerShare; // Accumulated degis per share (for those without veDEG boosting)
//         uint256 accDegisPerBonusShare; // Accumulated degis per bonus share (for those with veDEG boosting)
//         uint256 totalBonus; // Total bonus factors
//     }
//     PoolInfo[] public poolList;

//     // lptoken address => poolId
//     mapping(address => uint256) public poolMapping;

//     // poolId => alreadyFarming
//     mapping(uint256 => bool) public isFarming;

//     struct UserInfo {
//         uint256 rewardDebt; // degis reward debt
//         uint256 stakingBalance; // the amount of a user's staking in the pool
//         uint256 bonus; // user bonus point (by veDEG balance)
//     }
//     // poolId => userAddress => userInfo
//     mapping(uint256 => mapping(address => UserInfo)) public userInfo;

//     // Extra claimable balance when updating bonus from veDEG
//     mapping(uint256 => mapping(address => uint256)) public extraClaimable;

//     // Reward speed change with liquidity inside contract
//     mapping(uint256 => uint256[]) public thresholdBasic;
//     mapping(uint256 => uint256[]) public piecewiseBasic;
//     uint256 public currentRewardLevel;

//     // ---------------------------------------------------------------------------------------- //
//     // *************************************** Events ***************************************** //
//     // ---------------------------------------------------------------------------------------- //

//     event StartTimestampChanged(uint256 startTimestamp);
//     event Stake(address staker, uint256 poolId, uint256 amount);
//     event Withdraw(address staker, uint256 poolId, uint256 amount);
//     event Harvest(
//         address staker,
//         address rewardReceiver,
//         uint256 poolId,
//         uint256 pendingReward
//     );
//     event NewPoolAdded(
//         address lpToken,
//         uint256 basicDegisPerSecond,
//         uint256 bonusDegisPerSecond
//     );
//     event FarmingPoolStarted(uint256 poolId, uint256 timestamp);
//     event FarmingPoolStopped(uint256 poolId, uint256 timestamp);
//     event DegisRewardChanged(
//         uint256 poolId,
//         uint256 basicDegisPerSecond,
//         uint256 bonusDegisPerSecond
//     );
//     event PoolUpdated(
//         uint256 poolId,
//         uint256 accDegisPerShare,
//         uint256 accDegisPerBonusShare
//     );

//     // ---------------------------------------------------------------------------------------- //
//     // ************************************* Constructor ************************************** //
//     // ---------------------------------------------------------------------------------------- //

//     function initialize(address _degis) public initializer {
//         require(_degis != address(0), "Zero address");

//         __Ownable_init();
//         __ReentrancyGuard_init_unchained();
//         __Pausable_init_unchained();

//         degis = IDegisToken(_degis);

//         // Start from 1
//         _nextPoolId = 1;

//         poolList.push(
//             PoolInfo({
//                 lpToken: address(0),
//                 basicDegisPerSecond: 0,
//                 bonusDegisPerSecond: 0,
//                 lastRewardTimestamp: 0,
//                 accDegisPerShare: 0,
//                 accDegisPerBonusShare: 0,
//                 totalBonus: 0
//             })
//         );
//     }

//     // ---------------------------------------------------------------------------------------- //
//     // ************************************** Modifiers *************************************** //
//     // ---------------------------------------------------------------------------------------- //

//     /**
//      * @notice The address can not be zero
//      */
//     modifier notZeroAddress(address _address) {
//         require(_address != address(0), "Zero address");
//         _;
//     }

//     /**
//      * @notice The pool is still in farming
//      */
//     modifier stillFarming(uint256 _poolId) {
//         require(isFarming[_poolId], "Pool is not farming");
//         _;
//     }

//     // ---------------------------------------------------------------------------------------- //
//     // *********************************** View Functions ************************************* //
//     // ---------------------------------------------------------------------------------------- //

//     /**
//      * @notice Check the amount of pending degis reward
//      * @param _poolId PoolId of this farming pool
//      * @param _user User address
//      * @return pendingDegisAmount Amount of pending degis
//      */
//     function pendingDegis(uint256 _poolId, address _user)
//         external
//         view
//         returns (uint256)
//     {
//         PoolInfo memory poolInfo = poolList[_poolId];

//         if (
//             poolInfo.lastRewardTimestamp == 0 ||
//             block.timestamp < poolInfo.lastRewardTimestamp ||
//             block.timestamp < startTimestamp
//         ) return 0;

//         UserInfo memory user = userInfo[_poolId][_user];

//         // Total lp token balance
//         uint256 lp_balance = IERC20(poolInfo.lpToken).balanceOf(address(this));

//         // Accumulated shares to be calculated
//         uint256 accDegisPerShare = poolInfo.accDegisPerShare;
//         uint256 accDegisPerBonusShare = poolInfo.accDegisPerBonusShare;

//         if (lp_balance == 0) return 0;
//         else {
//             // If the pool is still farming, update the info
//             if (isFarming[_poolId]) {
//                 // Deigs amount given to this pool
//                 uint256 timePassed = block.timestamp -
//                     poolInfo.lastRewardTimestamp;
//                 uint256 basicReward = poolInfo.basicDegisPerSecond * timePassed;
//                 // Update accDegisPerShare
//                 // LPToken may have different decimals
//                 accDegisPerShare += (basicReward * SCALE) / lp_balance;

//                 // If there is any bonus reward
//                 if (poolInfo.totalBonus > 0) {
//                     uint256 bonusReward = poolInfo.bonusDegisPerSecond *
//                         timePassed;
//                     accDegisPerBonusShare +=
//                         (bonusReward * SCALE) /
//                         poolInfo.totalBonus;
//                 }
//             }

//             // If the pool has stopped, not update the info
//             uint256 pending = (user.stakingBalance *
//                 accDegisPerShare +
//                 user.bonus *
//                 accDegisPerBonusShare) /
//                 SCALE +
//                 extraClaimable[_poolId][_user] -
//                 user.rewardDebt;

//             return pending;
//         }
//     }

//     /**
//      * @notice Get the total pool list
//      * @return pooList Total pool list
//      */
//     function getPoolList() external view returns (PoolInfo[] memory) {
//         return poolList;
//     }

//     /**
//      * @notice Get a user's balance
//      * @param _poolId Id of the pool
//      * @param _user User address
//      * @return balance User's balance (lpToken)
//      */
//     function getUserBalance(uint256 _poolId, address _user)
//         external
//         view
//         returns (uint256)
//     {
//         return userInfo[_poolId][_user].stakingBalance;
//     }

//     // ---------------------------------------------------------------------------------------- //
//     // ************************************* Set Functions ************************************ //
//     // ---------------------------------------------------------------------------------------- //

//     function pause() external onlyOwner {
//         _pause();
//     }

//     function unpause() external onlyOwner {
//         _unpause();
//     }

//     function setVeDEG(address _veDEG) external onlyOwner {
//         veDEG = IVeDEG(_veDEG);
//     }

//     /**
//      * @notice Set the start block timestamp
//      * @param _startTimestamp New start block timestamp
//      */
//     function setStartTimestamp(uint256 _startTimestamp)
//         external
//         onlyOwner
//         whenNotPaused
//     {
//         // Can only be set before any pool is added
//         require(
//             _nextPoolId == 1,
//             "Can not set start timestamp after adding a pool"
//         );

//         startTimestamp = _startTimestamp;
//         emit StartTimestampChanged(_startTimestamp);
//     }

//     function setPiecewise(
//         uint256 _poolId,
//         uint256[] calldata _threshold,
//         uint256[] calldata _reward
//     ) external onlyOwner {
//         thresholdBasic[_poolId] = _threshold;
//         piecewiseBasic[_poolId] = _reward;
//     }

//     // ---------------------------------------------------------------------------------------- //
//     // *********************************** Main Functions ************************************* //
//     // ---------------------------------------------------------------------------------------- //

//     /**
//      * @notice Add a new lp into the pool
//      * @dev Can only be called by the owner
//      *      The reward speed can be 0 and set later by setDegisReward function
//      * @param _lpToken LP token address
//      * @param _basicDegisPerSecond Basic reward speed(per second) for this new pool
//      * @param _bonusDegisPerSecond Bonus reward speed(per second) for this new pool
//      * @param _withUpdate Whether update all pools' status
//      */
//     function add(
//         address _lpToken,
//         uint256 _basicDegisPerSecond,
//         uint256 _bonusDegisPerSecond,
//         bool _withUpdate
//     ) public notZeroAddress(_lpToken) onlyOwner whenNotPaused {
//         // Check if already exists, if the poolId is 0, that means not in the pool
//         require(!_alreadyInPool(_lpToken), "Already in the pool");

//         if (_bonusDegisPerSecond > 0)
//             require(_basicDegisPerSecond > 0, "Only bonus");

//         if (_withUpdate) {
//             massUpdatePools();
//         }

//         uint256 lastRewardTimestamp = block.timestamp > startTimestamp
//             ? block.timestamp
//             : startTimestamp;

//         // Push this new pool into the list
//         poolList.push(
//             PoolInfo({
//                 lpToken: _lpToken,
//                 basicDegisPerSecond: _basicDegisPerSecond,
//                 bonusDegisPerSecond: _bonusDegisPerSecond,
//                 lastRewardTimestamp: lastRewardTimestamp,
//                 accDegisPerShare: 0,
//                 accDegisPerBonusShare: 0,
//                 totalBonus: 0
//             })
//         );

//         // Store the poolId and set the farming status to true
//         if (_basicDegisPerSecond > 0) isFarming[_nextPoolId] = true;

//         poolMapping[_lpToken] = _nextPoolId++;

//         emit NewPoolAdded(_lpToken, _basicDegisPerSecond, _bonusDegisPerSecond);
//     }

//     /**
//      * @notice Update the degisPerSecond for a specific pool (set to 0 to stop farming)
//      * @param _poolId Id of the farming pool
//      * @param _basicDegisPerSecond New basic reward amount per second
//      * @param _bonusDegisPerSecond New bonus reward amount per second
//      * @param _withUpdate Whether update all pools
//      */
//     function setDegisReward(
//         uint256 _poolId,
//         uint256 _basicDegisPerSecond,
//         uint256 _bonusDegisPerSecond,
//         bool _withUpdate
//     ) public onlyOwner whenNotPaused {
//         // Ensure there already exists this pool
//         require(poolList[_poolId].lastRewardTimestamp != 0, "Pool not exists");

//         if (_bonusDegisPerSecond > 0)
//             require(_basicDegisPerSecond > 0, "Only bonus");

//         if (_withUpdate) massUpdatePools();
//         else updatePool(_poolId);

//         // Not farming now + reward > 0 => Restart
//         if (isFarming[_poolId] == false && _basicDegisPerSecond > 0) {
//             isFarming[_poolId] = true;
//             emit FarmingPoolStarted(_poolId, block.timestamp);
//         }

//         if (_basicDegisPerSecond == 0) {
//             isFarming[_poolId] = false;
//             emit FarmingPoolStopped(_poolId, block.timestamp);
//         } else {
//             poolList[_poolId].basicDegisPerSecond = _basicDegisPerSecond;
//             poolList[_poolId].bonusDegisPerSecond = _bonusDegisPerSecond;
//             emit DegisRewardChanged(
//                 _poolId,
//                 _basicDegisPerSecond,
//                 _bonusDegisPerSecond
//             );
//         }
//     }

//     /**
//      * @notice Stake LP token into the farming pool
//      * @dev Can only stake to the pools that are still farming
//      * @param _poolId Id of the farming pool
//      * @param _amount Staking amount
//      */
//     function stake(uint256 _poolId, uint256 _amount)
//         public
//         nonReentrant
//         whenNotPaused
//         stillFarming(_poolId)
//     {
//         require(_amount > 0, "Can not stake zero");

//         PoolInfo storage pool = poolList[_poolId];
//         UserInfo storage user = userInfo[_poolId][msg.sender];

//         // Must update first
//         updatePool(_poolId);

//         // First distribute the reward if exists
//         if (user.stakingBalance > 0) {
//             uint256 pending = (user.stakingBalance *
//                 pool.accDegisPerShare +
//                 user.bonus *
//                 pool.accDegisPerBonusShare) /
//                 SCALE +
//                 extraClaimable[_poolId][msg.sender] -
//                 user.rewardDebt;

//             // Clear the extra record (has been distributed)
//             extraClaimable[_poolId][msg.sender] = 0;

//             // Real reward amount by safe transfer
//             uint256 reward = _safeDegisTransfer(msg.sender, pending);
//             emit Harvest(msg.sender, msg.sender, _poolId, reward);
//         }

//         // Actual deposit amount
//         uint256 actualAmount = _safeLPTransfer(
//             false,
//             pool.lpToken,
//             msg.sender,
//             _amount
//         );

//         user.stakingBalance += actualAmount;

//         if (address(veDEG) != address(0)) {
//             // Update the user's bonus if veDEG boosting is on
//             uint256 oldBonus = user.bonus;
//             user.bonus = (user.stakingBalance * veDEG.balanceOf(msg.sender))
//                 .sqrt();
//             // Update the pool's total bonus
//             pool.totalBonus = pool.totalBonus + user.bonus - oldBonus;
//         }

//         user.rewardDebt =
//             (user.stakingBalance *
//                 pool.accDegisPerShare +
//                 user.bonus *
//                 pool.accDegisPerBonusShare) /
//             SCALE;

//         emit Stake(msg.sender, _poolId, actualAmount);
//     }

//     /**
//      * @notice Withdraw lptoken from the pool
//      * @param _poolId Id of the farming pool
//      * @param _amount Amount of lp tokens to withdraw
//      */
//     function withdraw(uint256 _poolId, uint256 _amount)
//         public
//         nonReentrant
//         whenNotPaused
//     {
//         require(_amount > 0, "Zero amount");

//         PoolInfo storage pool = poolList[_poolId];
//         UserInfo storage user = userInfo[_poolId][msg.sender];

//         require(user.stakingBalance >= _amount, "Not enough stakingBalance");

//         // Update if the pool is still farming
//         // Users can withdraw even after the pool stopped
//         if (isFarming[_poolId]) updatePool(_poolId);

//         uint256 pending = (user.stakingBalance *
//             pool.accDegisPerShare +
//             user.bonus *
//             pool.accDegisPerBonusShare) /
//             SCALE +
//             extraClaimable[_poolId][msg.sender] -
//             user.rewardDebt;

//         // Clear the extra record (has been distributed)
//         extraClaimable[_poolId][msg.sender] = 0;

//         // Real reward amount by safe transfer
//         uint256 reward = _safeDegisTransfer(msg.sender, pending);
//         emit Harvest(msg.sender, msg.sender, _poolId, reward);

//         uint256 actualAmount = _safeLPTransfer(
//             true,
//             pool.lpToken,
//             msg.sender,
//             _amount
//         );

//         user.stakingBalance -= actualAmount;

//         // Update the user's bonus when veDEG boosting is on
//         if (address(veDEG) != address(0)) {
//             uint256 oldBonus = user.bonus;
//             user.bonus = (user.stakingBalance * veDEG.balanceOf(msg.sender))
//                 .sqrt();
//             // Update the pool's total bonus
//             pool.totalBonus = pool.totalBonus + user.bonus - oldBonus;
//         }

//         user.rewardDebt =
//             (user.stakingBalance *
//                 pool.accDegisPerShare +
//                 user.bonus *
//                 pool.accDegisPerBonusShare) /
//             SCALE;

//         emit Withdraw(msg.sender, _poolId, actualAmount);
//     }

//     /**
//      * @notice Harvest the degis reward and can be sent to another address
//      * @param _poolId Id of the farming pool
//      * @param _to Receiver of degis rewards
//      */
//     function harvest(uint256 _poolId, address _to)
//         public
//         nonReentrant
//         whenNotPaused
//     {
//         // Only update the pool when it is still in farming
//         if (isFarming[_poolId]) updatePool(_poolId);

//         PoolInfo memory pool = poolList[_poolId];
//         UserInfo storage user = userInfo[_poolId][msg.sender];

//         uint256 pendingReward = (user.stakingBalance *
//             pool.accDegisPerShare +
//             user.bonus *
//             pool.accDegisPerBonusShare) /
//             SCALE +
//             extraClaimable[_poolId][msg.sender] -
//             user.rewardDebt;

//         extraClaimable[_poolId][msg.sender] = 0;

//         require(pendingReward > 0, "No pending reward");

//         // Update the reward debt
//         user.rewardDebt =
//             (user.stakingBalance *
//                 pool.accDegisPerShare +
//                 user.bonus *
//                 pool.accDegisPerBonusShare) /
//             SCALE;

//         // Transfer the reward
//         uint256 reward = _safeDegisTransfer(_to, pendingReward);

//         emit Harvest(msg.sender, _to, _poolId, reward);
//     }

//     /**
//      * @notice Update the pool's reward status
//      * @param _poolId Id of the farming pool
//      */
//     function updatePool(uint256 _poolId) public {
//         PoolInfo storage pool = poolList[_poolId];
//         if (block.timestamp <= pool.lastRewardTimestamp) {
//             return;
//         }

//         uint256 lpSupply = IERC20(pool.lpToken).balanceOf(address(this));

//         // No LP deposited, then just update the lastRewardTimestamp
//         if (lpSupply == 0) {
//             pool.lastRewardTimestamp = block.timestamp;
//             return;
//         }

//         uint256 timePassed = block.timestamp - pool.lastRewardTimestamp;

//         uint256 basicReward = timePassed * pool.basicDegisPerSecond;
//         uint256 bonusReward = timePassed * pool.bonusDegisPerSecond;

//         pool.accDegisPerShare += (basicReward * SCALE) / lpSupply;

//         if (pool.totalBonus == 0) {
//             pool.accDegisPerBonusShare = 0;
//         } else {
//             pool.accDegisPerBonusShare +=
//                 (bonusReward * SCALE) /
//                 pool.totalBonus;
//         }

//         // Don't forget to set the farming pool as minter
//         degis.mintDegis(address(this), basicReward + bonusReward);

//         pool.lastRewardTimestamp = block.timestamp;

//         // Update the new reward speed
//         // Only if the threshold are already set
//         if (thresholdBasic[_poolId].length > 0) {
//             uint256 currentLiquidity = thresholdBasic[_poolId][
//                 currentRewardLevel
//             ];
//             if (
//                 currentRewardLevel < thresholdBasic[_poolId].length - 1 &&
//                 lpSupply >= thresholdBasic[_poolId][currentRewardLevel + 1]
//             ) {
//                 _updateRewardSpeed(_poolId);
//             } else if (lpSupply < currentLiquidity) {
//                 _updateRewardSpeed(_poolId);
//             }
//         }

//         emit PoolUpdated(
//             _poolId,
//             pool.accDegisPerShare,
//             pool.accDegisPerBonusShare
//         );
//     }

//     /**
//      * @notice Update all farming pools (except for those stopped ones)
//      * @dev Can be called by anyone
//      *      Only update those active pools
//      */
//     function massUpdatePools() public {
//         uint256 length = poolList.length;
//         for (uint256 poolId; poolId < length; poolId++) {
//             if (isFarming[poolId] == false) continue;
//             else updatePool(poolId);
//         }
//     }

//     /**
//      * @notice Update a user's bonus
//      * @dev When veDEG has balance change
//      *      Only called by veDEG contract
//      * @param _user User address
//      * @param _newVeDEGBalance New veDEG balance
//      */
//     function updateBonus(address _user, uint256 _newVeDEGBalance) external {
//         require(msg.sender == address(veDEG), "Only veDEG contract");

//         // loop over each pool : beware gas cost!
//         uint256 length = poolList.length;

//         for (uint256 poolId; poolId < length; ++poolId) {
//             // Skip if the pool is not farming
//             if (!isFarming[poolId]) continue;

//             UserInfo storage user = userInfo[poolId][_user];
//             // Skip if user doesn't have any deposit in the pool
//             if (user.stakingBalance == 0) continue;

//             PoolInfo storage pool = poolList[poolId];

//             // first, update pool
//             updatePool(poolId);

//             // Update the extra claimable amount
//             uint256 pending = (user.stakingBalance *
//                 pool.accDegisPerShare +
//                 user.bonus *
//                 pool.accDegisPerBonusShare) /
//                 SCALE -
//                 user.rewardDebt;
//             extraClaimable[poolId][_user] += pending;

//             // get oldFactor
//             uint256 oldFactor = user.bonus; // get old factor
//             // calculate newFactor
//             uint256 newFactor = (_newVeDEGBalance * user.stakingBalance).sqrt();
//             // update user factor
//             user.bonus = newFactor;
//             // update reward debt, take into account newFactor
//             user.rewardDebt =
//                 (user.stakingBalance *
//                     pool.accDegisPerShare +
//                     newFactor *
//                     pool.accDegisPerBonusShare) /
//                 SCALE;

//             // Update the pool's total bonus
//             pool.totalBonus = pool.totalBonus + newFactor - oldFactor;
//         }
//     }

//     // ---------------------------------------------------------------------------------------- //
//     // ********************************** Internal Functions ********************************** //
//     // ---------------------------------------------------------------------------------------- //

//     /**
//      * @notice Check if a lptoken has been added into the pool before
//      * @dev This can also be written as a modifier
//      * @param _lpToken LP token address
//      * @return _isInPool Wether this lp is already in pool
//      */
//     function _alreadyInPool(address _lpToken)
//         internal
//         view
//         returns (bool _isInPool)
//     {
//         uint256 poolId = poolMapping[_lpToken];

//         _isInPool = (poolId != 0) ? true : false;
//     }

//     /**
//      * @notice Safe degis transfer (check if the pool has enough DEGIS token)
//      * @param _to User's address
//      * @param _amount Amount to transfer
//      */
//     function _safeDegisTransfer(address _to, uint256 _amount)
//         internal
//         returns (uint256)
//     {
//         uint256 poolDegisBalance = degis.balanceOf(address(this));
//         require(poolDegisBalance > 0, "No Degis token in the pool");

//         if (_amount > poolDegisBalance) {
//             degis.safeTransfer(_to, poolDegisBalance);
//             return (poolDegisBalance);
//         } else {
//             degis.safeTransfer(_to, _amount);
//             return _amount;
//         }
//     }

//     /**
//      * @notice Finish the transfer of LP Token
//      * @dev The lp token may have loss during transfer
//      * @param _out Whether the lp token is out
//      * @param _lpToken LP token address
//      * @param _user User address
//      * @param _amount Amount of lp tokens
//      */
//     function _safeLPTransfer(
//         bool _out,
//         address _lpToken,
//         address _user,
//         uint256 _amount
//     ) internal returns (uint256) {
//         uint256 poolBalanceBefore = IERC20(_lpToken).balanceOf(address(this));

//         if (_out) IERC20(_lpToken).safeTransfer(_user, _amount);
//         else IERC20(_lpToken).safeTransferFrom(_user, address(this), _amount);

//         uint256 poolBalanceAfter = IERC20(_lpToken).balanceOf(address(this));

//         return
//             _out
//                 ? poolBalanceBefore - poolBalanceAfter
//                 : poolBalanceAfter - poolBalanceBefore;
//     }

//     /**
//      * @notice Update the reward speed
//      * @param _poolId Pool ID
//      */
//     function _updateRewardSpeed(uint256 _poolId) internal {
//         uint256 currentBasicBalance = IERC20(poolList[_poolId].lpToken)
//             .balanceOf(address(this));

//         uint256 basicRewardSpeed;

//         for (uint256 i = thresholdBasic[_poolId].length - 1; i >= 0; --i) {
//             if (currentBasicBalance >= thresholdBasic[_poolId][i]) {
//                 basicRewardSpeed = piecewiseBasic[_poolId][i];
//                 // record current reward level
//                 currentRewardLevel = i;
//                 break;
//             } else continue;
//         }

//         poolList[_poolId].basicDegisPerSecond = basicRewardSpeed;
//     }
// }