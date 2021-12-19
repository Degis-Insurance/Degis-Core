// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../libraries/SafePRBMath.sol";

import "../tokens/interfaces/IDegisToken.sol";
import "../lucky-box/interfaces/IDegisLottery.sol";

import "../utils/OwnableWithoutContext.sol";

import "./abstracts/InsurancePoolStore.sol";

/**
 * @title  Insurance Pool
 * @notice Insurance pool is the reserved risk pool for flight delay product.
 *         For simplicity, some state variables are in the InsurancePoolStore contract.
 */
contract InsurancePool is
    ERC20("Degis FlightDelay LPToken", "DLP"),
    InsurancePoolStore,
    OwnableWithoutContext
{
    using SafeERC20 for IERC20;
    using SafePRBMath for uint256;

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Other Contracts ************************************ //
    // ---------------------------------------------------------------------------------------- //

    IDegisToken public degis;
    IERC20 public USDT;
    IDegisLottery public degisLottery;

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Constructor function
     * @param _degisToken Degis token address
     * @param _emergencyPool Emergency pool address
     * @param _degisLottery Lottery address
     * @param _usdtAddress USDT address
     */
    constructor(
        address _degisToken,
        address _emergencyPool,
        address _degisLottery,
        address _usdtAddress
    ) {
        // Initialize some factors
        collateralFactor = 1e18;
        lockedRatio = 1e18;
        LPValue = 1e18;

        emergencyPool = _emergencyPool;

        degis = IDegisToken(_degisToken);
        USDT = IERC20(_usdtAddress);

        degisLottery = IDegisLottery(_degisLottery);

        // Initial distribution, 0: LP 1: Lottery 2: Emergency
        rewardDistribution[0] = 50;
        rewardDistribution[1] = 40;
        rewardDistribution[2] = 10;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************** Modifiers *************************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Only the policyFlow contract can call some functions
     */
    modifier onlyPolicyFlow() {
        require(
            _msgSender() == policyFlow,
            "Only the policyFlow contract can call this function"
        );
        _;
    }

    /**
     * @notice The address can not be zero
     */
    modifier notZeroAddress(address _address) {
        require(_address != address(0), "Can not be zero address");
        _;
    }

    /**
     * @notice There is a frozen time for unstaking
     */
    modifier afterFrozenTime(address _userAddress) {
        require(
            block.timestamp >= userInfo[_userAddress].depositTime + frozenTime,
            "Can not withdraw until the fronzen time"
        );
        _;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ View Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Get the real balance: LPValue * LP_Num
     * @dev Used in many places so give it a seperate function
     * @param _userAddress User's address
     * @return _userBalance Real balance of this user
     */
    function getUserBalance(address _userAddress)
        public
        view
        returns (uint256 _userBalance)
    {
        uint256 lp_num = balanceOf(_userAddress);
        _userBalance = lp_num.mul(LPValue);
    }

    /**
     * @notice Get the balance that one user(LP) can unlock
     * @param _userAddress User's address
     * @return _unlockedAmount Unlocked amount of the pool
     */
    function getUnlockedFor(address _userAddress)
        public
        view
        returns (uint256 _unlockedAmount)
    {
        uint256 userBalance = getUserBalance(_userAddress);
        _unlockedAmount = availableCapacity >= userBalance
            ? userBalance
            : availableCapacity;
    }

    /**
     * @notice Get the user's locked balance
     * @param _userAddress User's address
     * @return _locked User's locked balance (as the locked ratio)
     */
    function getLockedFor(address _userAddress)
        public
        view
        returns (uint256 _locked)
    {
        uint256 userBalance = getUserBalance(_userAddress);
        _locked = lockedRatio.mul(userBalance);
    }

    /**
     * @notice Check the conditions when receive new buying request
     * @param _payoff Payoff of the policy to be bought
     * @return Whether there is enough capacity in the pool for this payoff
     */
    function checkCapacity(uint256 _payoff) external view returns (bool) {
        return availableCapacity >= _payoff;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Owner Functions *********************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Set a new frozen time
     * @param _newFrozenTime New frozen time, in timestamp(s)
     */
    function setFrozenTime(uint256 _newFrozenTime) external onlyOwner {
        frozenTime = _newFrozenTime;
        emit FrozenTimeChanged(_newFrozenTime);
    }

    /**
     * @notice Set the address of policyFlow
     */
    function setPolicyFlow(address _policyFlowAddress)
        public
        onlyOwner
        notZeroAddress(_policyFlowAddress)
    {
        policyFlow = _policyFlowAddress;
        emit PolicyFlowSet(_policyFlowAddress);
    }

    /**
     * @notice Set the premium reward distribution
     * @param _newDistribution New distribution [LP, Lottery, Emergency]
     */
    function setIncomeDistribution(uint256[3] memory _newDistribution)
        public
        onlyOwner
    {
        uint256 sum = _newDistribution[0] +
            _newDistribution[1] +
            _newDistribution[2];
        require(sum == 100, "Reward distribution must sum to 100");

        for (uint256 i = 0; i < 3; i++) {
            rewardDistribution[i] = _newDistribution[i];
        }
        emit RewardDistributionChanged(
            _newDistribution[0],
            _newDistribution[1],
            _newDistribution[2]
        );
    }

    /**
     * @notice Change the collateral factor
     * @param _factor The new collateral factor
     */
    function setCollateralFactor(uint256 _factor) public onlyOwner {
        require(_factor > 0, "Collateral Factor should be larger than 0");
        uint256 oldFactor = collateralFactor;
        collateralFactor = _factor.div(100);
        emit CollateralFactorChanged(oldFactor, _factor);
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice LPs stake assets into the pool
     * @param _userAddress Address of the user, can be another user's address
     * @param _amount The amount that the user want to stake
     */
    function stake(address _userAddress, uint256 _amount)
        external
        notZeroAddress(_userAddress)
    {
        require(
            IERC20(USDT).balanceOf(msg.sender) >= _amount && _amount > 0,
            "You do not have enough USD or input 0 amount"
        );

        _deposit(_userAddress, _amount);
    }

    /**
     * @notice Unstake from the pool (May fail if a claim happens before this operation)
     * @dev Only unstake by yourself
     * @param _amount The amount that the user want to unstake
     */
    function unstake(uint256 _amount)
        external
        notZeroAddress(msg.sender)
        afterFrozenTime(msg.sender)
    {
        address _userAddress = msg.sender;

        uint256 userBalance = getUserBalance(_userAddress);
        require(
            _amount <= userBalance && _amount > 0,
            "Not enough balance to be unlocked or your withdraw amount is 0"
        );

        uint256 unlocked = totalStakingBalance - lockedBalance;
        uint256 unstakeAmount = _amount;

        // Will jump this part when the pool has enough liquidity
        if (_amount > unlocked) {
            uint256 remainingURequest = _amount - unlocked;
            unstakeRequests[_userAddress].push(
                UnstakeRequest(remainingURequest, 0, false)
            );
            unstakeQueue.push(_userAddress);
            unstakeAmount = unlocked; // only withdraw the unlocked value
            userInfo[_userAddress].pendingBalance += remainingURequest;
        }

        _withdraw(_userAddress, unstakeAmount);
    }

    /**
     * @notice Unstake the max amount of a user
     */
    function unstakeMax()
        external
        notZeroAddress(msg.sender)
        afterFrozenTime(msg.sender)
    {
        address _userAddress = msg.sender;

        uint256 userBalance = getUserBalance(_userAddress);

        uint256 unlocked = totalStakingBalance - lockedBalance;
        uint256 unstakeAmount = userBalance;

        // Will jump this part when the pool has enough liquidity
        if (userBalance > unlocked) {
            uint256 remainingURequest = userBalance - unlocked;
            unstakeRequests[_userAddress].push(
                UnstakeRequest(remainingURequest, 0, false)
            );
            unstakeQueue.push(_userAddress);
            unstakeAmount = unlocked; // only withdraw the unlocked value
            userInfo[_userAddress].pendingBalance += remainingURequest;
        }

        _withdraw(_userAddress, unstakeAmount);
    }

    /**
     * @notice Update the pool variables when buying policies
     * @dev Capacity check is done before calling this function
     * @param _premium Policy's premium
     * @param _payoff Policy's payoff (max payoff)
     * @param _userAddress Address of the buyer
     */
    function updateWhenBuy(
        uint256 _premium,
        uint256 _payoff,
        address _userAddress
    ) external onlyPolicyFlow {
        // Update pool status
        lockedBalance += _payoff;
        activePremiums += _premium;
        availableCapacity -= _payoff;

        // Update lockedRatio
        lockedRatio = lockedBalance.div(totalStakingBalance);

        // Remember approval
        USDT.safeTransferFrom(_userAddress, address(this), _premium);

        emit BuyNewPolicy(_userAddress, _premium, _payoff);
    }

    /**
     * @notice Update the status when a policy expires
     * @param _premium Policy's premium
     * @param _payoff Policy's payoff (max payoff)
     */
    function updateWhenExpire(uint256 _premium, uint256 _payoff)
        external
        onlyPolicyFlow
    {
        // Update pool status
        activePremiums -= _premium;
        lockedBalance -= _payoff;
        availableCapacity += _payoff;

        // Distribute the premium
        _distributePremium(_premium);

        // If there is any unstake request in the queue
        uint256 remainingPayoff = _payoff;
        if (unstakeQueue.length > 0) {
            _dealUnstakeQueue(remainingPayoff);
        }

        _updateLPValue();
    }

    /**
     * @notice Pay a claim
     * @param _premium Premium of the policy
     * @param _payoff Max payoff of the policy
     * @param _realPayoff Real payoff of the policy
     * @param _userAddress Address of the policy claimer
     */
    function payClaim(
        uint256 _premium,
        uint256 _payoff,
        uint256 _realPayoff,
        address _userAddress
    ) external onlyPolicyFlow notZeroAddress(_userAddress) {
        // Update the pool status
        lockedBalance -= _payoff;
        totalStakingBalance -= _realPayoff;
        realStakingBalance -= _realPayoff;
        activePremiums -= _premium;

        // Distribute the premium
        _distributePremium(_premium);

        // Pay the claim
        USDT.safeTransfer(_userAddress, _realPayoff);

        _updateLPValue();
    }

    /**
     * @notice revert the last unstake request for a user
     * @param _userAddress user's address
     */
    function revertUnstakeRequest(address _userAddress)
        public
        notZeroAddress(_userAddress)
    {
        require(
            _msgSender() == _userAddress || _msgSender() == owner(),
            "Only the owner or the user himself can revert"
        );

        UnstakeRequest[] storage userRequests = unstakeRequests[_userAddress];
        require(
            userRequests.length > 0,
            "this user has no pending unstake request"
        );

        uint256 index = userRequests.length - 1;
        uint256 remainingRequest = userRequests[index].pendingAmount -
            userRequests[index].fulfilledAmount;

        realStakingBalance += remainingRequest;
        userInfo[_userAddress].pendingBalance -= remainingRequest;

        _removeOneRequest(_userAddress);
    }

    /**
     * @notice revert all unstake requests for a user
     * @param _userAddress user's address
     */
    function revertAllUnstakeRequest(address _userAddress)
        public
        notZeroAddress(_userAddress)
    {
        require(
            _msgSender() == _userAddress || _msgSender() == owner(),
            "Only the owner or the user himself can revert"
        );

        UnstakeRequest[] storage userRequests = unstakeRequests[_userAddress];
        require(
            userRequests.length > 0,
            "this user has no pending unstake request"
        );
        _removeAllRequest(_userAddress);
        delete unstakeRequests[_userAddress];

        uint256 remainingRequest = userInfo[_userAddress].pendingBalance;
        realStakingBalance += remainingRequest;
        userInfo[_userAddress].pendingBalance = 0;
    }

    // ---------------------------------------------------------------------------------------- //
    // ********************************** Internal Functions ********************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Remove all unstake requests for a user
     * @param _userAddress User's address
     */
    function _removeAllRequest(address _userAddress) internal {
        for (uint256 i = 0; i < unstakeRequests[_userAddress].length; i += 1) {
            _removeOneRequest(_userAddress);
        }
    }

    /**
     * @notice Remove one(the latest) unstake requests for a user
     * @param _userAddress User's address
     */
    function _removeOneRequest(address _userAddress) internal {
        uint256 index = unstakeQueue.length - 1;

        while (index >= 0) {
            if (unstakeQueue[index] == _userAddress) break;
            index -= 1;
        }

        for (uint256 j = index; j < unstakeQueue.length - 1; j += 1) {
            unstakeQueue[j] = unstakeQueue[j + 1];
        }

        unstakeQueue.pop();
    }

    /**
     * @notice Finish the deposit process
     * @dev LPValue will not change during deposit
     * @param _userAddress Address of the user who deposits
     * @param _amount Amount he deposits
     */
    function _deposit(address _userAddress, uint256 _amount) internal {
        uint256 amountWithFactor = _amount.mul(collateralFactor);

        // Update the pool's status
        totalStakingBalance += _amount;
        realStakingBalance += _amount;
        availableCapacity += amountWithFactor;

        lockedRatio = lockedBalance.div(totalStakingBalance);

        // msg.sender always pays
        USDT.safeTransferFrom(msg.sender, address(this), _amount);

        // LP Token number need to be newly minted
        uint256 lp_num = _amount.div(LPValue);
        _mint(_userAddress, lp_num);

        userInfo[_userAddress].depositTime = block.timestamp;

        emit Stake(_userAddress, _amount);
    }

    /**
     * @notice _withdraw: finish the withdraw action, only when meeting the conditions
     * @dev LPValue will not change during withdraw
     * @param _userAddress address of the user who withdraws
     * @param _amount the amount he withdraws
     */
    function _withdraw(address _userAddress, uint256 _amount) internal {
        uint256 amountWithFactor = _amount.mul(collateralFactor);
        // Update the pool's status
        totalStakingBalance -= _amount;
        realStakingBalance -= _amount;
        availableCapacity -= amountWithFactor;

        lockedRatio = lockedBalance.div(totalStakingBalance);

        USDT.safeTransfer(_userAddress, _amount);

        uint256 lp_num = _amount.div(LPValue);
        _burn(_userAddress, lp_num);

        emit Unstake(_userAddress, _amount);
    }

    /**
     * @notice Distribute the premium to lottery and emergency pool
     * @param _premium Premium amount to be distributed
     */
    function _distributePremium(uint256 _premium) internal {
        uint256 premiumToLottery = _premium.mul(rewardDistribution[1].div(100));

        uint256 premiumToEmergency = _premium.mul(
            rewardDistribution[2].div(100)
        );

        // Transfer some reward to emergency pool
        USDT.safeTransfer(emergencyPool, premiumToEmergency);

        // Transfer some reward to lottery
        uint256 currentLotteryId = degisLottery.viewCurrentLotteryId();
        degisLottery.injectFunds(currentLotteryId, premiumToLottery);

        emit PremiumDistributed(premiumToEmergency, premiumToLottery);
    }

    /**
     * @notice Update the value of each lp token
     * @dev Normally it will update when claim or expire
     */
    function _updateLPValue() internal {
        uint256 totalLP = totalSupply();
        uint256 totalBalance = IERC20(USDT).balanceOf(address(this));

        LPValue = (totalBalance - activePremiums).div(totalLP);
    }

    /**
     * @notice When some capacity unlocked, deal with the unstake queue
     * @dev Normally we do not need this process
     * @param remainingPayoff Remaining payoff amount
     */
    function _dealUnstakeQueue(uint256 remainingPayoff) internal {
        uint256 pendingAmount;
        for (uint256 i = unstakeQueue.length - 1; i >= 0; i -= 1) {
            if (remainingPayoff >= 0) {
                address pendingUser = unstakeQueue[i];
                for (
                    uint256 j = 0;
                    j < unstakeRequests[pendingUser].length;
                    j++
                ) {
                    pendingAmount = unstakeRequests[pendingUser][j]
                        .pendingAmount;
                    if (remainingPayoff > pendingAmount) {
                        remainingPayoff -= pendingAmount;

                        for (
                            uint256 k = 0;
                            k < unstakeRequests[pendingUser].length - 1;
                            k += 1
                        ) {
                            unstakeRequests[pendingUser][k] = unstakeRequests[
                                pendingUser
                            ][k + 1];
                        }
                        unstakeRequests[pendingUser].pop();

                        _withdraw(pendingUser, pendingAmount);
                    } else {
                        unstakeRequests[pendingUser][j]
                            .pendingAmount -= remainingPayoff;
                        unstakeRequests[pendingUser][j]
                            .fulfilledAmount += remainingPayoff;
                        _withdraw(pendingUser, remainingPayoff);

                        remainingPayoff = 0;
                        break;
                    }
                }
            } else break;
        }
    }
}
