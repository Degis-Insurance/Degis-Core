// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "../interfaces/IPool.sol";
import "../interfaces/IStakingPoolFactory.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "../../libraries/SafePRBMath.sol";

abstract contract BasePool is IPool, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using SafePRBMath for uint256;

    /// @dev Data structure representing token holder using a pool
    struct UserInfo {
        uint256 tokenAmount;
        uint256 totalWeight;
        uint256 rewardDebts;
        // @dev An array of holder's deposits
        Deposit[] deposits;
    }
    mapping(address => UserInfo) public users;

    // Token address staked in this pool
    address public poolToken;

    // Reward token: degis
    address public degisToken;

    uint256 public startBlock;

    // Degis reward speed
    uint256 public degisPerBlock;

    bool public isFlashPool;

    // Last check point
    uint256 public lastRewardBlock;

    uint256 public accDegisPerWeight;

    // Total weight in the pool
    uint256 public totalWeight;

    // Factory contract address
    address public factory;

    // Weight multiplier constants
    uint256 internal constant WEIGHT_MULTIPLIER = 1e6;

    uint256 internal constant YEAR_STAKE_WEIGHT_MULTIPLIER =
        2 * WEIGHT_MULTIPLIER;

    uint256 internal constant REWARD_PER_WEIGHT_MULTIPLIER = 1e12;

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Events ***************************************** //
    // ---------------------------------------------------------------------------------------- //

    event Stake(address user, uint256 amount, uint256 lockUntil);

    event Unstake(address user, uint256 amount);

    event Harvest(address user, uint256 amount);

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //

    constructor(
        address _degisToken,
        address _poolToken,
        address _factory,
        uint256 _startBlock,
        uint256 _degisPerBlock,
        bool _isFlashPool
    ) {
        degisToken = _degisToken;
        poolToken = _poolToken;
        factory = _factory;
        isFlashPool = _isFlashPool;

        degisPerBlock = _degisPerBlock;

        startBlock = _startBlock;

        // lastRewardBlock = block.number > startBlock ? block.number : startBlock;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************** Modifiers *************************************** //
    // ---------------------------------------------------------------------------------------- //

    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory");
        _;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ View Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    function getDepositsLength(address _user) external view returns (uint256) {
        return users[_user].deposits.length;
    }

    function getUserDeposits(address _user)
        external
        view
        returns (Deposit[] memory)
    {
        return users[_user].deposits;
    }

    function pendingRewards(address _user) external view returns (uint256) {
        if (block.number < lastRewardBlock || block.number < startBlock)
            return 0;

        uint256 blocks = block.number - lastRewardBlock;
        uint256 degisReward = blocks * degisPerBlock;

        // recalculated value for `yieldRewardsPerWeight`
        uint256 newDegisPerWeight = rewardToWeight(degisReward, totalWeight) +
            accDegisPerWeight;

        // based on the rewards per weight value, calculate pending rewards;
        UserInfo memory user = users[_user];

        uint256 pending = weightToReward(user.totalWeight, newDegisPerWeight) -
            user.rewardDebts;

        return pending;
    }

    function rewardToWeight(uint256 reward, uint256 rewardPerWeight)
        public
        pure
        returns (uint256)
    {
        // apply the reverse formula and return
        return (reward * REWARD_PER_WEIGHT_MULTIPLIER).div(rewardPerWeight);
    }

    function weightToReward(uint256 weight, uint256 rewardPerWeight)
        public
        pure
        returns (uint256)
    {
        // apply the formula and return
        return weight.mul(rewardPerWeight) / REWARD_PER_WEIGHT_MULTIPLIER;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Set Functions ************************************* //
    // ---------------------------------------------------------------------------------------- //
    function setDegisPerBlock(uint256 _degisPerBlock) external onlyFactory {
        degisPerBlock = _degisPerBlock;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    function stake(uint256 _amount, uint256 _lockUntil) external {
        // delegate call to an internal function
        _stake(msg.sender, _amount, _lockUntil);
    }

    function unstake(uint256 _depositId, uint256 _amount) external {
        // delegate call to an internal function
        _unstake(msg.sender, _depositId, _amount);
    }

    function harvest() external {
        updatePool();

        UserInfo storage user = users[msg.sender];

        // calculate pending yield rewards, this value will be returned
        uint256 _pendingReward = _pendingRewards(msg.sender);

        if (_pendingReward == 0) return;

        _safeDegisTransfer(msg.sender, _pendingReward);

        user.rewardDebts = weightToReward(user.totalWeight, accDegisPerWeight);

        emit Harvest(msg.sender, _pendingReward);
    }

    function updatePool() public {
        if (block.number < lastRewardBlock || block.number < startBlock) return;

        uint256 balance = IERC20(poolToken).balanceOf(address(this));

        if (balance == 0) {
            lastRewardBlock = block.number;
            return;
        }

        uint256 blocks = block.number - lastRewardBlock;

        uint256 degisReward = blocks * degisPerBlock;

        IStakingPoolFactory(factory).mintReward(address(this), degisReward);

        accDegisPerWeight += rewardToWeight(degisReward, totalWeight);

        lastRewardBlock = block.number;
    }

    function _stake(
        address _user,
        uint256 _amount,
        uint256 _lockUntil
    ) internal virtual nonReentrant {
        require(_amount > 0, "Zero amount");
        require(
            _lockUntil == 0 ||
                (_lockUntil > block.timestamp &&
                    _lockUntil - block.timestamp <= 365 days),
            "Invalid lock interval"
        );

        updatePool();

        UserInfo storage user = users[_user];

        if (user.tokenAmount > 0) {
            _distributeReward(_user);
        }

        uint256 previousBalance = IERC20(poolToken).balanceOf(address(this));
        transferPoolTokenFrom(msg.sender, address(this), _amount);
        uint256 newBalance = IERC20(poolToken).balanceOf(address(this));

        uint256 addedAmount = newBalance - previousBalance;

        uint256 lockFrom = _lockUntil > 0 ? block.timestamp : 0;
        uint256 lockUntil = _lockUntil;

        uint256 stakeWeight = timeToWeight(lockUntil - lockFrom) * addedAmount;

        // makes sure stakeWeight is valid
        assert(stakeWeight > 0);

        // create and save the deposit (append it to deposits array)
        Deposit memory deposit = Deposit({
            tokenAmount: addedAmount,
            weight: stakeWeight,
            lockedFrom: lockFrom,
            lockedUntil: lockUntil
        });
        // deposit ID is an index of the deposit in `deposits` array
        user.deposits.push(deposit);

        // update user record
        user.tokenAmount += addedAmount;
        user.totalWeight += stakeWeight;
        user.rewardDebts = weightToReward(user.totalWeight, accDegisPerWeight);

        // update global variable
        totalWeight += stakeWeight;

        // emit an event
        emit Stake(msg.sender, _amount, _lockUntil);
    }

    /**
     * @dev Used internally, mostly by children implementations, see unstake()
     * @param _user User address
     * @param _depositId deposit ID to unstake from, zero-indexed
     * @param _amount amount of tokens to unstake
     */
    function _unstake(
        address _user,
        uint256 _depositId,
        uint256 _amount
    ) internal virtual nonReentrant {
        // verify an amount is set
        require(_amount > 0, "zero amount");

        UserInfo storage user = users[_user];

        Deposit storage stakeDeposit = user.deposits[_depositId];

        // verify available balance
        // if staker address ot deposit doesn't exist this check will fail as well
        require(stakeDeposit.tokenAmount >= _amount, "amount exceeds stake");

        // update smart contract state
        updatePool();
        // and process current pending rewards if any
        _distributeReward(_user);

        // recalculate deposit weight
        uint256 previousWeight = stakeDeposit.weight;

        uint256 newWeight = timeToWeight(
            stakeDeposit.lockedUntil - stakeDeposit.lockedFrom
        ) * (stakeDeposit.tokenAmount - _amount);

        // update the deposit, or delete it if its depleted
        if (stakeDeposit.tokenAmount - _amount == 0) {
            delete user.deposits[_depositId];
        } else {
            stakeDeposit.tokenAmount -= _amount;
            stakeDeposit.weight = newWeight;
        }

        // update user record
        user.tokenAmount -= _amount;
        user.totalWeight = user.totalWeight - previousWeight + newWeight;
        user.rewardDebts = weightToReward(user.totalWeight, accDegisPerWeight);

        // update global variable
        totalWeight -= (previousWeight - newWeight);

        // otherwise just return tokens back to holder
        transferPoolToken(msg.sender, _amount);

        // emit an event
        emit Unstake(msg.sender, _amount);
    }

    /**
     * @dev 1 year = 2e6
     *      1 week = 1e6
     *      2 weeks = 1e6 * ( 1 + 1 / 365)
     */
    function timeToWeight(uint256 _length)
        public
        pure
        returns (uint256 _weight)
    {
        _weight = (_length / 365 days) * WEIGHT_MULTIPLIER + WEIGHT_MULTIPLIER;
    }

    function _pendingRewards(address _staker)
        internal
        view
        returns (uint256 pending)
    {
        // read user data structure into memory
        UserInfo memory user = users[_staker];

        // and perform the calculation using the values read
        return
            weightToReward(user.totalWeight, accDegisPerWeight) -
            user.rewardDebts;
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Internal Functions ********************************* //
    // ---------------------------------------------------------------------------------------- //

    function _distributeReward(address _user) internal {
        uint256 pendingReward = _pendingRewards(_user);

        if (pendingReward == 0) return;
        else {
            _safeDegisTransfer(_user, pendingReward);
        }
    }

    function transferPoolToken(address _to, uint256 _value) internal {
        // just delegate call to the target
        IERC20(poolToken).safeTransfer(_to, _value);
    }

    function transferPoolTokenFrom(
        address _from,
        address _to,
        uint256 _value
    ) internal {
        IERC20(poolToken).safeTransferFrom(_from, _to, _value);
    }

    /**
     * @notice Safe degis transfer (check if the pool has enough DEGIS token)
     * @param _to User's address
     * @param _amount Amount to transfer
     */
    function _safeDegisTransfer(address _to, uint256 _amount) internal {
        uint256 totalDegis = IERC20(degisToken).balanceOf(address(this));
        if (_amount > totalDegis) {
            IERC20(degisToken).safeTransfer(_to, totalDegis);
        } else {
            IERC20(degisToken).safeTransfer(_to, _amount);
        }
    }
}
