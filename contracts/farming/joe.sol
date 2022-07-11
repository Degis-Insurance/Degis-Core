// SPDX-License-Intifier: MIT;
pragma solidity ^0.8.10;
// /// @notice The (older) MasterChefJoeV2 contract gives out a constant number of JOE tokens per block.
// /// It is the only address with minting rights for JOE.
// /// The idea for this MasterChefJoeV3 (MCJV3) contract is therefore to be the owner of a dummy token
// /// that is deposited into the MasterChefJoeV2 (MCJV2) contract.
// /// The allocation point for this pool on MCJV3 is the total allocation point for all pools that receive double incentives.
// contract MasterChefJoeV3 is Ownable, ReentrancyGuard {
//     using SafeMath for uint256;
//     using BoringERC20 for IERC20;
//     using EnumerableSet for EnumerableSet.AddressSet;

//     /// @notice Info of each MCJV3 user.
//     /// `amount` LP token amount the user has provided.
//     /// `rewardDebt` The amount of JOE entitled to the user.
//     struct UserInfo {
//         uint256 amount;
//         uint256 rewardDebt;
//     }

//     /// @notice Info of each MCJV3 pool.
//     /// `allocPoint` The amount of allocation points assigned to the pool.
//     /// Also known as the amount of JOE to distribute per block.
//     struct PoolInfo {
//         IERC20 lpToken;
//         uint256 accJoePerShare;
//         uint256 lastRewardTimestamp;
//         uint256 allocPoint;
//         IRewarder rewarder;
//     }

//     /// @notice Address of MCJV2 contract.
//     IMasterChef public immutable MASTER_CHEF_V2;
//     /// @notice Address of JOE contract.
//     IERC20 public immutable JOE;
//     /// @notice The index of MCJV3 master pool in MCJV2
//     uint256 public immutable MASTER_PID;
//     /// @notice Info of each MCJV3 pool.
//     PoolInfo[] public poolInfo;
//     // Set of all LP tokens that have been added as pools
//     EnumerableSet.AddressSet private lpTokens;
//     /// @notice Info of each user that stakes LP tokens.
//     mapping(uint256 => mapping(address => UserInfo)) public userInfo;
//     /// @dev Total allocation points. Must be the sum of all allocation points in all pools.
//     uint256 public totalAllocPoint;
//     uint256 private constant ACC_TOKEN_PRECISION = 1e18;

//     event Add(uint256 indexed pid, uint256 allocPoint, IERC20 indexed lpToken, IRewarder indexed rewarder);
//     event Set(uint256 indexed pid, uint256 allocPoint, IRewarder indexed rewarder, bool overwrite);
//     event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
//     event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
//     event UpdatePool(uint256 indexed pid, uint256 lastRewardTimestamp, uint256 lpSupply, uint256 accJoePerShare);
//     event Harvest(address indexed user, uint256 indexed pid, uint256 amount);
//     event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);
//     event Init();

//     /// @param _MASTER_CHEF_V2 The JoeSwap MCJV2 contract address.
//     /// @param _joe The JOE token contract address.
//     /// @param _MASTER_PID The pool ID of the dummy token on the base MCJV2 contract.
//     constructor(
//         IMasterChef _MASTER_CHEF_V2,
//         IERC20 _joe,
//         uint256 _MASTER_PID
//     ) public {
//         MASTER_CHEF_V2 = _MASTER_CHEF_V2;
//         JOE = _joe;
//         MASTER_PID = _MASTER_PID;
//     }

//     /// @notice Deposits a dummy token to `MASTER_CHEF_V2` MCJV2. This is required because MCJV2 holds the minting rights for JOE.
//     /// Any balance of transaction sender in `dummyToken` is transferred.
//     /// The allocation point for the pool on MCJV2 is the total allocation point for all pools that receive double incentives.
//     /// @param dummyToken The address of the ERC-20 token to deposit into MCJV2.
//     function init(IERC20 dummyToken) external onlyOwner {
//         uint256 balance = dummyToken.balanceOf(msg.sender);
//         require(balance != 0, "MasterChefV2: Balance must exceed 0");
//         dummyToken.safeTransferFrom(msg.sender, address(this), balance);
//         dummyToken.approve(address(MASTER_CHEF_V2), balance);
//         MASTER_CHEF_V2.deposit(MASTER_PID, balance);
//         emit Init();
//     }

//     /// @notice Returns the number of MCJV3 pools.
//     function poolLength() external view returns (uint256 pools) {
//         pools = poolInfo.length;
//     }

//     /// @notice Add a new LP to the pool. Can only be called by the owner.
//     /// DO NOT add the same LP token more than once. Rewards will be messed up if you do.
//     /// @param allocPoint AP of the new pool.
//     /// @param _lpToken Address of the LP ERC-20 token.
//     /// @param _rewarder Address of the rewarder delegate.
//     function add(
//         uint256 allocPoint,
//         IERC20 _lpToken,
//         IRewarder _rewarder
//     ) external onlyOwner {
//         require(!lpTokens.contains(address(_lpToken)), "add: LP already added");
//         // Sanity check to ensure _lpToken is an ERC20 token
//         _lpToken.balanceOf(address(this));
//         // Sanity check if we add a rewarder
//         if (address(_rewarder) != address(0)) {
//             _rewarder.onJoeReward(address(0), 0);
//         }

//         uint256 lastRewardTimestamp = block.timestamp;
//         totalAllocPoint = totalAllocPoint.add(allocPoint);

//         poolInfo.push(
//             PoolInfo({
//                 lpToken: _lpToken,
//                 allocPoint: allocPoint,
//                 lastRewardTimestamp: lastRewardTimestamp,
//                 accJoePerShare: 0,
//                 rewarder: _rewarder
//             })
//         );
//         lpTokens.add(address(_lpToken));
//         emit Add(poolInfo.length.sub(1), allocPoint, _lpToken, _rewarder);
//     }

//     /// @notice Update the given pool's JOE allocation point and `IRewarder` contract. Can only be called by the owner.
//     /// @param _pid The index of the pool. See `poolInfo`.
//     /// @param _allocPoint New AP of the pool.
//     /// @param _rewarder Address of the rewarder delegate.
//     /// @param overwrite True if _rewarder should be `set`. Otherwise `_rewarder` is ignored.
//     function set(
//         uint256 _pid,
//         uint256 _allocPoint,
//         IRewarder _rewarder,
//         bool overwrite
//     ) external onlyOwner {
//         PoolInfo memory pool = poolInfo[_pid];
//         totalAllocPoint = totalAllocPoint.sub(poolInfo[_pid].allocPoint).add(_allocPoint);
//         pool.allocPoint = _allocPoint;
//         if (overwrite) {
//             _rewarder.onJoeReward(address(0), 0); // sanity check
//             pool.rewarder = _rewarder;
//         }
//         poolInfo[_pid] = pool;
//         emit Set(_pid, _allocPoint, overwrite ? _rewarder : pool.rewarder, overwrite);
//     }

//     /// @notice View function to see pending JOE on frontend.
//     /// @param _pid The index of the pool. See `poolInfo`.
//     /// @param _user Address of user.
//     /// @return pendingJoe JOE reward for a given user.
//     //          bonusTokenAddress The address of the bonus reward.
//     //          bonusTokenSymbol The symbol of the bonus token.
//     //          pendingBonusToken The amount of bonus rewards pending.
//     function pendingTokens(uint256 _pid, address _user)
//         external
//         view
//         returns (
//             uint256 pendingJoe,
//             address bonusTokenAddress,
//             string memory bonusTokenSymbol,
//             uint256 pendingBonusToken
//         )
//     {
//         PoolInfo memory pool = poolInfo[_pid];
//         UserInfo storage user = userInfo[_pid][_user];
//         uint256 accJoePerShare = pool.accJoePerShare;
//         uint256 lpSupply = pool.lpToken.balanceOf(address(this));
//         if (block.timestamp > pool.lastRewardTimestamp && lpSupply != 0) {
//             uint256 secondsElapsed = block.timestamp.sub(pool.lastRewardTimestamp);
//             uint256 joeReward = secondsElapsed.mul(joePerSec()).mul(pool.allocPoint).div(totalAllocPoint);
//             accJoePerShare = accJoePerShare.add(joeReward.mul(ACC_TOKEN_PRECISION).div(lpSupply));
//         }
//         pendingJoe = user.amount.mul(accJoePerShare).div(ACC_TOKEN_PRECISION).sub(user.rewardDebt);

//         // If it's a double reward farm, we return info about the bonus token
//         if (address(pool.rewarder) != address(0)) {
//             bonusTokenAddress = address(pool.rewarder.rewardToken());
//             bonusTokenSymbol = IERC20(pool.rewarder.rewardToken()).safeSymbol();
//             pendingBonusToken = pool.rewarder.pendingTokens(_user);
//         }
//     }

//     /// @notice Update reward variables for all pools. Be careful of gas spending!
//     /// @param pids Pool IDs of all to be updated. Make sure to update all active pools.
//     function massUpdatePools(uint256[] calldata pids) external {
//         uint256 len = pids.length;
//         for (uint256 i = 0; i < len; ++i) {
//             updatePool(pids[i]);
//         }
//     }

//     /// @notice Calculates and returns the `amount` of JOE per block.
//     function joePerSec() public view returns (uint256 amount) {
//         uint256 total = 1000;
//         uint256 lpPercent = total.sub(MASTER_CHEF_V2.devPercent()).sub(MASTER_CHEF_V2.treasuryPercent()).sub(
//             MASTER_CHEF_V2.investorPercent()
//         );
//         uint256 lpShare = MASTER_CHEF_V2.joePerSec().mul(lpPercent).div(total);
//         amount = lpShare.mul(MASTER_CHEF_V2.poolInfo(MASTER_PID).allocPoint).div(MASTER_CHEF_V2.totalAllocPoint());
//     }

//     /// @notice Update reward variables of the given pool.
//     /// @param pid The index of the pool. See `poolInfo`.
//     function updatePool(uint256 pid) public {
//         PoolInfo memory pool = poolInfo[pid];
//         if (block.timestamp > pool.lastRewardTimestamp) {
//             uint256 lpSupply = pool.lpToken.balanceOf(address(this));
//             if (lpSupply > 0) {
//                 uint256 secondsElapsed = block.timestamp.sub(pool.lastRewardTimestamp);
//                 uint256 joeReward = secondsElapsed.mul(joePerSec()).mul(pool.allocPoint).div(totalAllocPoint);
//                 pool.accJoePerShare = pool.accJoePerShare.add((joeReward.mul(ACC_TOKEN_PRECISION).div(lpSupply)));
//             }
//             pool.lastRewardTimestamp = block.timestamp;
//             poolInfo[pid] = pool;
//             emit UpdatePool(pid, pool.lastRewardTimestamp, lpSupply, pool.accJoePerShare);
//         }
//     }

//     /// @notice Deposit LP tokens to MCJV3 for JOE allocation.
//     /// @param pid The index of the pool. See `poolInfo`.
//     /// @param amount LP token amount to deposit.
//     function deposit(uint256 pid, uint256 amount) external nonReentrant {
//         harvestFromMasterChef();
//         updatePool(pid);
//         PoolInfo memory pool = poolInfo[pid];
//         UserInfo storage user = userInfo[pid][msg.sender];

//         if (user.amount > 0) {
//             // Harvest JOE
//             uint256 pending = user.amount.mul(pool.accJoePerShare).div(ACC_TOKEN_PRECISION).sub(user.rewardDebt);
//             JOE.safeTransfer(msg.sender, pending);
//             emit Harvest(msg.sender, pid, pending);
//         }

//         uint256 balanceBefore = pool.lpToken.balanceOf(address(this));
//         pool.lpToken.safeTransferFrom(msg.sender, address(this), amount);
//         uint256 receivedAmount = pool.lpToken.balanceOf(address(this)).sub(balanceBefore);

//         // Effects
//         user.amount = user.amount.add(receivedAmount);
//         user.rewardDebt = user.amount.mul(pool.accJoePerShare).div(ACC_TOKEN_PRECISION);

//         // Interactions
//         IRewarder _rewarder = pool.rewarder;
//         if (address(_rewarder) != address(0)) {
//             _rewarder.onJoeReward(msg.sender, user.amount);
//         }

//         emit Deposit(msg.sender, pid, receivedAmount);
//     }

//     /// @notice Withdraw LP tokens from MCJV3.
//     /// @param pid The index of the pool. See `poolInfo`.
//     /// @param amount LP token amount to withdraw.
//     function withdraw(uint256 pid, uint256 amount) external nonReentrant {
//         harvestFromMasterChef();
//         updatePool(pid);
//         PoolInfo memory pool = poolInfo[pid];
//         UserInfo storage user = userInfo[pid][msg.sender];

//         if (user.amount > 0) {
//             // Harvest JOE
//             uint256 pending = user.amount.mul(pool.accJoePerShare).div(ACC_TOKEN_PRECISION).sub(user.rewardDebt);
//             JOE.safeTransfer(msg.sender, pending);
//             emit Harvest(msg.sender, pid, pending);
//         }

//         // Effects
//         user.amount = user.amount.sub(amount);
//         user.rewardDebt = user.amount.mul(pool.accJoePerShare).div(ACC_TOKEN_PRECISION);

//         // Interactions
//         IRewarder _rewarder = pool.rewarder;
//         if (address(_rewarder) != address(0)) {
//             _rewarder.onJoeReward(msg.sender, user.amount);
//         }

//         pool.lpToken.safeTransfer(msg.sender, amount);

//         emit Withdraw(msg.sender, pid, amount);
//     }

//     /// @notice Withdraw without caring about rewards. EMERGENCY ONLY.
//     /// @param pid The index of the pool. See `poolInfo`.
//     function emergencyWithdraw(uint256 pid) external nonReentrant {
//         PoolInfo memory pool = poolInfo[pid];
//         UserInfo storage user = userInfo[pid][msg.sender];
//         uint256 amount = user.amount;
//         user.amount = 0;
//         user.rewardDebt = 0;

//         IRewarder _rewarder = pool.rewarder;
//         if (address(_rewarder) != address(0)) {
//             _rewarder.onJoeReward(msg.sender, 0);
//         }

//         // Note: transfer can fail or succeed if `amount` is zero.
//         pool.lpToken.safeTransfer(msg.sender, amount);
//         emit EmergencyWithdraw(msg.sender, pid, amount);
//     }
// }
