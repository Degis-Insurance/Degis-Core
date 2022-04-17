// SPDX-License-Identifier: GPL-3.0-or-later

/*
 //======================================================================\\
 //======================================================================\\
    *******         **********     ***********     *****     ***********
    *      *        *              *                 *       *
    *        *      *              *                 *       *
    *         *     *              *                 *       *
    *         *     *              *                 *       *
    *         *     **********     *       *****     *       ***********
    *         *     *              *         *       *                 *
    *         *     *              *         *       *                 *
    *        *      *              *         *       *                 *
    *      *        *              *         *       *                 *
    *******         **********     ***********     *****     ***********
 \\======================================================================//
 \\======================================================================//
*/
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "../tokens/interfaces/IBuyerToken.sol";
import "../tokens/interfaces/IDegisToken.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "../libraries/SafePRBMath.sol";

/**
 * @title  Purchase Incentive Vault
 * @notice This is the purchase incentive vault for staking buyer tokens
 *         Users first stake their buyer tokens and wait for distribution
 *         About every 24 hours, the reward will be calculated to users' account
 *         After disrtribution, reward will be updated
 *              but it still need to be manually claimed.
 *
 *         Buyer tokens can only be used once
 *         You can withdraw your buyer token within the same round (current round)
 *         They can not be withdrawed if the round was settled
 */
contract PurchaseIncentiveVault is
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20 for IBuyerToken;
    using SafePRBMath for uint256;

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Variables **************************************** //
    // ---------------------------------------------------------------------------------------- //

    string public constant name = "Degis Purchase Incentive Vault";

    // Buyer Token & Degis Token SCALE = 1e18
    uint256 public constant SCALE = 1e18;

    // Other contracts
    IBuyerToken buyerToken;
    IDegisToken degis;

    // Current round number
    uint256 public currentRound;

    // Degis reward per round
    uint256 public degisPerRound;

    // The interval will only limit the distribution (not the staking)
    uint256 public distributionInterval;

    // Last distribution block
    uint256 public lastDistribution;

    // Max round for one claim
    uint256 public constant MAX_ROUND = 50;

    struct RoundInfo {
        uint256 shares;
        address[] users;
        bool hasDistributed;
        uint256 degisPerShare;
    }
    mapping(uint256 => RoundInfo) public roundInfo;

    struct UserInfo {
        uint256 lastRewardRoundIndex;
        uint256[] pendingRounds;
    }
    mapping(address => UserInfo) public userInfo;

    // User address => Round number => User shares
    mapping(address => mapping(uint256 => uint256)) public userSharesInRound;

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Events ***************************************** //
    // ---------------------------------------------------------------------------------------- //

    event DegisRewardChanged(
        uint256 oldRewardPerRound,
        uint256 newRewardPerRound
    );
    event DistributionIntervalChanged(uint256 oldInterval, uint256 newInterval);
    event Stake(
        address userAddress,
        uint256 currentRound,
        uint256 actualAmount
    );
    event Redeem(address userAddress, uint256 currentRound, uint256 amount);
    event RewardClaimed(address userAddress, uint256 userReward);
    event RoundSettled(uint256 currentRound, uint256 blockNumber);

    error PIV__NotPassedInterval();
    error PIV__ZeroAmount();
    error PIV__NotEnoughBuyerTokens();
    error PIV__AlreadyDistributed();
    error PIV__NoPendingRound();
    error PIV__ClaimedAll();

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //

    function initialize(address _buyerToken, address _degisToken)
        public
        initializer
    {
        __Ownable_init();
        __Pausable_init();
        __ReentrancyGuard_init();

        // Initialize two tokens
        buyerToken = IBuyerToken(_buyerToken);
        degis = IDegisToken(_degisToken);

        // Initialize the last distribution time
        lastDistribution = block.timestamp;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************** Modifiers *************************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Check if admins can distribute now
     * @dev Should pass the distribution interval
     */
    modifier hasPassedInterval() {
        if (block.timestamp - lastDistribution <= distributionInterval)
            revert PIV__NotPassedInterval();

        _;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ View Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Get the amount of users in _round, used for distribution
     * @param _round Round number to check
     * @return totalUsers Total amount of users in _round
     */
    function getTotalUsersInRound(uint256 _round)
        external
        view
        returns (uint256)
    {
        return roundInfo[_round].users.length;
    }

    /**
     * @notice Get the user addresses in _round
     * @param _round Round number to check
     * @return users All user addresses in this round
     */
    function getUsersInRound(uint256 _round)
        external
        view
        returns (address[] memory)
    {
        return roundInfo[_round].users;
    }

    /**
     * @notice Get user's pending rounds
     * @param _user User address to check
     * @return pendingRounds User's pending rounds
     */
    function getUserPendingRounds(address _user)
        external
        view
        returns (uint256[] memory)
    {
        return userInfo[_user].pendingRounds;
    }

    /**
     * @notice Get your shares in the current round
     * @param _user Address of the user
     * @param _round Round number
     * @return userShares User's shares in the current round
     */
    function getUserShares(address _user, uint256 _round)
        external
        view
        returns (uint256)
    {
        return userSharesInRound[_user][_round];
    }

    /**
     * @notice Get a user's pending reward
     * @param _user User address
     * @return userPendingReward User's pending reward
     */
    function pendingReward(address _user)
        external
        view
        returns (uint256 userPendingReward)
    {
        UserInfo memory user = userInfo[_user];

        // Total rounds that need to be distributed
        uint256 length = user.pendingRounds.length - user.lastRewardRoundIndex;

        // Start from last reward round index
        uint256 startIndex = user.lastRewardRoundIndex;

        for (uint256 i = startIndex; i < startIndex + length; i++) {
            uint256 round = user.pendingRounds[i];

            userPendingReward +=
                (roundInfo[round].degisPerShare *
                    userSharesInRound[_user][round]) /
                SCALE;
        }
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Set Functions ************************************* //
    // ---------------------------------------------------------------------------------------- //

    function pause() external onlyOwner {
        super._pause();
    }

    function unpause() external onlyOwner {
        super._unpause();
    }

    /**
     * @notice Set degis distribution per round
     * @param _degisPerRound Degis distribution per round
     */
    function setDegisPerRound(uint256 _degisPerRound) external onlyOwner {
        emit DegisRewardChanged(degisPerRound, _degisPerRound);
        degisPerRound = _degisPerRound;
    }

    /**
     * @notice Set a new distribution interval
     * @param _newInterval The new interval
     */
    function setDistributionInterval(uint256 _newInterval) external onlyOwner {
        emit DistributionIntervalChanged(distributionInterval, _newInterval);
        distributionInterval = _newInterval;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Stake buyer tokens into this contract
     * @param _amount Amount of buyer tokens to stake
     */
    function stake(uint256 _amount) external nonReentrant whenNotPaused {
        if (_amount == 0) revert PIV__ZeroAmount();

        // Save gas
        uint256 round = currentRound;

        // User info of msg.sender
        UserInfo storage user = userInfo[msg.sender];

        // If the user has not staked in this round, record this new user to the users array
        if (userSharesInRound[msg.sender][round] == 0) {
            roundInfo[round].users.push(msg.sender);
        }

        userSharesInRound[msg.sender][round] += _amount;

        uint256 length = user.pendingRounds.length;
        // Only add the round if it's not in the array
        // Condition 1: length == 0 => no pending rounds => add this round
        // Condition 2: length != 0 && last pending round is not the current round => add this round
        if (
            length == 0 ||
            (length != 0 && user.pendingRounds[length - 1] != currentRound)
        ) user.pendingRounds.push(currentRound);

        // Update the total shares
        roundInfo[round].shares += _amount;

        // Finally finish the token transfer
        buyerToken.safeTransferFrom(msg.sender, address(this), _amount);

        emit Stake(msg.sender, round, _amount);
    }

    /**
     * @notice Redeem buyer token from the vault
     * @param _amount Amount to redeem
     */
    function redeem(uint256 _amount) external nonReentrant whenNotPaused {
        if (_amount == 0) revert PIV__ZeroAmount();

        uint256 userBalance = userSharesInRound[msg.sender][currentRound];

        if (userBalance < _amount) revert PIV__NotEnoughBuyerTokens();

        uint256 round = currentRound;

        userSharesInRound[msg.sender][round] -= _amount;

        // If redeem all buyer tokens, remove this round from the user's pending rounds
        if (userSharesInRound[msg.sender][round] == 0) {
            userInfo[msg.sender].pendingRounds.pop();
        }

        roundInfo[round].shares -= _amount;

        // Finally finish the buyer token transfer
        buyerToken.safeTransfer(msg.sender, _amount);

        emit Redeem(msg.sender, round, _amount);
    }

    /**
     * @notice Setttle the current round
     * @dev Callable by any address, must pass the distribution interval
     */
    function settleCurrentRound() external hasPassedInterval whenNotPaused {
        RoundInfo storage info = roundInfo[currentRound];
        if (info.hasDistributed) revert PIV__AlreadyDistributed();

        uint256 totalShares = info.shares;

        // If no one staked, no reward
        if (totalShares == 0) info.degisPerShare = 0;
        else info.degisPerShare = (degisPerRound * SCALE) / totalShares;

        info.hasDistributed = true;

        // Update current round, ++ save little gas
        ++currentRound;

        // Update last distribution time
        lastDistribution = block.timestamp;

        emit RoundSettled(currentRound, block.timestamp);
    }

    /**
     * @notice User can claim his own reward
     */
    function claim() external nonReentrant whenNotPaused {
        UserInfo memory user = userInfo[msg.sender];

        if (user.pendingRounds.length == 0) revert PIV__NoPendingRound();

        uint256 roundsToClaim = user.pendingRounds.length -
            user.lastRewardRoundIndex;

        if (roundsToClaim == 0) revert PIV__ClaimedAll();

        if (user.pendingRounds[user.pendingRounds.length - 1] == currentRound) {
            roundsToClaim -= 1;
        }

        if (roundsToClaim > MAX_ROUND) {
            roundsToClaim = MAX_ROUND;
            userInfo[msg.sender].lastRewardRoundIndex += MAX_ROUND;
        } else userInfo[msg.sender].lastRewardRoundIndex += roundsToClaim;

        uint256 userPendingReward;
        uint256 startIndex = user.lastRewardRoundIndex;

        for (uint256 i = startIndex; i < startIndex + roundsToClaim; i++) {
            uint256 round = user.pendingRounds[i];

            userPendingReward +=
                (roundInfo[round].degisPerShare *
                    userSharesInRound[msg.sender][round]) /
                SCALE;
        }

        // Mint reward to user
        degis.mintDegis(msg.sender, userPendingReward);
    }
}
