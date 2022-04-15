// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

import "../interfaces/IPool.sol";
import "../interfaces/IStakingPoolFactory.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

abstract contract BasePool is IPool, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Variables **************************************** //
    // ---------------------------------------------------------------------------------------- //

    struct UserInfo {
        uint256 tokenAmount;
        uint256 totalWeight;
        uint256 rewardDebt;
        // An array of holder's deposits
        Deposit[] deposits;
    }
    mapping(address => UserInfo) public users;

    // Token address staked in this pool
    address public poolToken;

    // Reward token: degis
    address public degisToken;

    // Reward start timestamp
    uint256 public startTimestamp;

    // Degis reward speed
    uint256 public degisPerSecond;

    // Last check point
    uint256 public lastRewardTimestamp;

    // Accumulated degis per weight till now
    uint256 public accDegisPerWeight;

    // Total weight in the pool
    uint256 public totalWeight;

    // Factory contract address
    address public factory;

    // Fees are paid to the previous stakers
    uint256 public constant fee = 2;

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

    /**
     * @notice Constructor
     */
    constructor(
        address _degisToken,
        address _poolToken,
        address _factory,
        uint256 _startTimestamp,
        uint256 _degisPerSecond
    ) {
        degisToken = _degisToken;
        poolToken = _poolToken;
        factory = _factory;

        degisPerSecond = _degisPerSecond;

        startTimestamp = _startTimestamp;

        lastRewardTimestamp = block.timestamp > _startTimestamp
            ? block.timestamp
            : _startTimestamp;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************** Modifiers *************************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Only the factory can call some functions
     */
    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory");
        _;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ View Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Get a user's deposit info
     * @param _user User address
     * @return deposits[] User's deposit info
     */
    function getUserDeposits(address _user)
        external
        view
        returns (Deposit[] memory)
    {
        return users[_user].deposits;
    }

    /**
     * @notice Get pending rewards
     * @param _user User address
     * @return pendingReward User's pending rewards
     */
    function pendingReward(address _user) external view returns (uint256) {
        if (
            block.timestamp < lastRewardTimestamp ||
            block.timestamp < startTimestamp ||
            totalWeight == 0
        ) return 0;

        uint256 blocks = block.timestamp - lastRewardTimestamp;
        uint256 degisReward = blocks * degisPerSecond;

        // recalculated value for `yieldRewardsPerWeight`
        uint256 newDegisPerWeight = rewardToWeight(degisReward, totalWeight) +
            accDegisPerWeight;

        // based on the rewards per weight value, calculate pending rewards;
        UserInfo memory user = users[_user];

        uint256 pending = weightToReward(user.totalWeight, newDegisPerWeight) -
            user.rewardDebt;

        return pending;
    }

    function rewardToWeight(uint256 reward, uint256 rewardPerWeight)
        public
        pure
        returns (uint256)
    {
        return (reward * REWARD_PER_WEIGHT_MULTIPLIER) / rewardPerWeight;
    }

    function weightToReward(uint256 weight, uint256 rewardPerWeight)
        public
        pure
        returns (uint256)
    {
        return (weight * rewardPerWeight) / REWARD_PER_WEIGHT_MULTIPLIER;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Set Functions ************************************* //
    // ---------------------------------------------------------------------------------------- //
    function setDegisPerSecond(uint256 _degisPerSecond) external onlyFactory {
        degisPerSecond = _degisPerSecond;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Stake tokens
     * @param _amount Amount of tokens to stake
     * @param _lockUntil Lock until timestamp
     */
    function stake(uint256 _amount, uint256 _lockUntil) external {
        _stake(msg.sender, _amount, _lockUntil);
    }

    /**
     * @notice Unstake tokens
     * @param _depositId Deposit id to be unstaked
     * @param _amount Amount of tokens to unstake
     */
    function unstake(uint256 _depositId, uint256 _amount) external {
        _unstake(msg.sender, _depositId, _amount);
    }

    /**
     * @notice Harvest your staking rewards
     */
    function harvest() external {
        // First update the pool
        updatePool();

        UserInfo storage user = users[msg.sender];

        // calculate pending yield rewards, this value will be returned
        uint256 pending = _pendingReward(msg.sender);

        if (pending == 0) return;

        _safeDegisTransfer(msg.sender, pending);

        user.rewardDebt = weightToReward(user.totalWeight, accDegisPerWeight);

        emit Harvest(msg.sender, pending);
    }

    /**
     * @notice Update the pool without fee
     */
    function updatePool() public {
        _updatePoolWithFee(0);
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Internal Functions ********************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Update pool status with fee (if any)
     * @param _fee Fee to be distributed
     */
    function _updatePoolWithFee(uint256 _fee) internal {
        if (block.timestamp <= lastRewardTimestamp) return;

        uint256 balance = IERC20(poolToken).balanceOf(address(this));

        if (balance == 0) {
            lastRewardTimestamp = block.timestamp;
            return;
        }

        uint256 timePassed = block.timestamp - lastRewardTimestamp;

        // There is _fee when staking
        uint256 degisReward = timePassed * degisPerSecond + _fee;

        // Mint reward to this staking pool
        IStakingPoolFactory(factory).mintReward(address(this), degisReward);

        accDegisPerWeight += rewardToWeight(degisReward, totalWeight);

        lastRewardTimestamp = block.timestamp;
    }

    /**
     * @notice Finish stake process
     * @param _user User address
     * @param _amount Amount of tokens to stake
     * @param _lockUntil Lock until timestamp
     */
    function _stake(
        address _user,
        uint256 _amount,
        uint256 _lockUntil
    ) internal virtual nonReentrant {
        require(block.timestamp > startTimestamp, "Pool not started yet");
        require(_amount > 0, "Zero amount");
        require(
            _lockUntil == 0 || (_lockUntil > block.timestamp),
            "Invalid lock interval"
        );
        if (_lockUntil >= block.timestamp + 365 days)
            _lockUntil = block.timestamp + 365 days;

        uint256 depositFee;
        if (IERC20(poolToken).balanceOf(address(this)) > 0) {
            // Charge deposit fee and distribute to previous stakers
            depositFee = (_amount * fee) / 100;
            _updatePoolWithFee(depositFee);
        } else updatePool();

        UserInfo storage user = users[_user];

        if (user.tokenAmount > 0) {
            _distributeReward(_user);
        }

        uint256 previousBalance = IERC20(poolToken).balanceOf(address(this));
        transferPoolTokenFrom(msg.sender, address(this), _amount);
        uint256 newBalance = IERC20(poolToken).balanceOf(address(this));

        // Actual amount is without the fee
        uint256 addedAmount = newBalance - previousBalance - depositFee;

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
        user.rewardDebt = weightToReward(user.totalWeight, accDegisPerWeight);

        // update global variable
        totalWeight += stakeWeight;

        // emit an event
        emit Stake(msg.sender, _amount, _lockUntil);
    }

    /**
     * @notice Finish unstake process
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
        user.rewardDebt = weightToReward(user.totalWeight, accDegisPerWeight);

        // update global variable
        totalWeight -= (previousWeight - newWeight);

        // otherwise just return tokens back to holder
        transferPoolToken(msg.sender, _amount);

        // emit an event
        emit Unstake(msg.sender, _amount);
    }

    /**
     * @notice Lock time => Lock weight
     * @dev 1 year = 2e6
     *      1 week = 1e6
     *      2 weeks = 1e6 * ( 1 + 1 / 365)
     */
    function timeToWeight(uint256 _length)
        public
        pure
        returns (uint256 _weight)
    {
        _weight =
            ((_length * WEIGHT_MULTIPLIER) / 365 days) +
            WEIGHT_MULTIPLIER;
    }

    /**
     * @notice Check pending reward after update
     * @param _user User address
     */
    function _pendingReward(address _user)
        internal
        view
        returns (uint256 pending)
    {
        // read user data structure into memory
        UserInfo memory user = users[_user];

        // and perform the calculation using the values read
        return
            weightToReward(user.totalWeight, accDegisPerWeight) -
            user.rewardDebt;
    }

    /**
     * @notice Distribute reward to staker
     * @param _user User address
     */
    function _distributeReward(address _user) internal {
        uint256 pending = _pendingReward(_user);

        if (pending == 0) return;
        else {
            _safeDegisTransfer(_user, pending);
        }
    }

    /**
     * @notice Transfer pool token from pool to user
     */
    function transferPoolToken(address _to, uint256 _value) internal {
        // just delegate call to the target
        IERC20(poolToken).safeTransfer(_to, _value);
    }

    /**
     * @notice Transfer pool token from user to pool
     * @param _from User address
     * @param _to Pool address
     * @param _value Amount of tokens to transfer
     */
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
