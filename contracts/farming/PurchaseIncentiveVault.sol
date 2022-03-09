// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../tokens/interfaces/IBuyerToken.sol";
import "../tokens/interfaces/IDegisToken.sol";
import "../utils/Ownable.sol";

import "../utils/Pausable.sol";

import "../libraries/SafePRBMath.sol";

/**
 * @title  Purchase Incentive Vault
 * @notice This is the purchase incentive vault for staking buyer tokens.
 *         Users first stake their buyer tokens and wait for distribution.
 *         About every 24 hours, the reward will be calculated to users' account.
 *         After disrtribution, users' reward balance will update but they still need to manually claim the reward.
 */
contract PurchaseIncentiveVault is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IBuyerToken;
    using SafePRBMath for uint256;

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Variables **************************************** //
    // ---------------------------------------------------------------------------------------- //

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

    uint256 public MAX_ROUND = 50;

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

    // User address => Pending rewards
    mapping(address => uint256) public userRewards;

    mapping(address => uint256) public userLastRewardRound;

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Events ***************************************** //
    // ---------------------------------------------------------------------------------------- //

    event DegisRewardChanged(uint256 oldPerRound, uint256 newPerRound);
    event DistributionIntervalChanged(uint256 oldInterval, uint256 newInterval);
    event MaxRoundChanged(uint256 oldMaxRound, uint256 newMaxRound);
    event Stake(
        address userAddress,
        uint256 currentRound,
        uint256 actualAmount
    );
    event Redeem(address userAddress, uint256 currentRound, uint256 amount);
    event RewardClaimed(address userAddress, uint256 userReward);
    event RoundSettled(uint256 currentRound, uint256 blockNumber);

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //

    constructor(address _buyerToken, address _degisToken) {
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
        require(
            block.timestamp - lastDistribution > distributionInterval,
            "Two distributions should have an interval"
        );
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
        public
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
        public
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
        public
        view
        returns (uint256[] memory)
    {
        return userInfo[_user].pendingRounds;
    }

    /**
     * @notice Get your shares in the current round
     * @param _user Address of the user
     */
    function getUserShares(address _user) public view returns (uint256) {
        return userSharesInRound[_user][currentRound];
    }

    /**
     * @notice Get a user's pending reward
     * @return userPendingReward User's pending reward
     */
    function pendingReward() public view returns (uint256 userPendingReward) {
        UserInfo memory user = userInfo[_msgSender()];

        uint256 length = user.pendingRounds.length - user.lastRewardRoundIndex;
        uint256 startIndex = user.lastRewardRoundIndex;

        for (uint256 i = startIndex; i < startIndex + length; i++) {
            uint256 round = user.pendingRounds[i];

            userPendingReward += roundInfo[round].degisPerShare.mul(
                userSharesInRound[_msgSender()][round]
            );
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
     * @param _degisPerRound Degis distribution per round to be set
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

    /**
     * @notice Set the max rounds to claim rewards
     */
    function setMaxRound(uint256 _maxRound) external onlyOwner {
        emit MaxRoundChanged(MAX_ROUND, _maxRound);

        MAX_ROUND = _maxRound;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Stake buyer tokens into this contract
     * @param _amount Amount of buyer tokens to stake
     */
    function stake(uint256 _amount) external nonReentrant whenNotPaused {
        require(_amount > 0, "Amount must be greater than 0");

        uint256 vaultBalanceBefore = buyerToken.balanceOf(address(this));
        buyerToken.safeTransferFrom(_msgSender(), address(this), _amount);
        uint256 vaultBalanceAfter = buyerToken.balanceOf(address(this));

        uint256 actualAmount = vaultBalanceAfter - vaultBalanceBefore;

        // If the user has not staked in this round, record this new user
        if (userSharesInRound[_msgSender()][currentRound] == 0) {
            roundInfo[currentRound].users.push(_msgSender());
        }

        userSharesInRound[_msgSender()][currentRound] += actualAmount;

        uint256 length = userInfo[_msgSender()].pendingRounds.length;

        // Initialize the last reward round
        if (length == 0) userInfo[_msgSender()].lastRewardRoundIndex = 0;

        // Only add the round if it's not in the array
        if (
            length == 0 ||
            (length != 0 &&
                userInfo[_msgSender()].pendingRounds[length - 1] !=
                currentRound)
        ) userInfo[_msgSender()].pendingRounds.push(currentRound);

        // Update the total shares
        roundInfo[currentRound].shares += actualAmount;

        emit Stake(_msgSender(), currentRound, actualAmount);
    }

    /**
     * @notice Redeem buyer token from the vault
     * @param _amount Amount to redeem
     */
    function redeem(uint256 _amount) external nonReentrant whenNotPaused {
        require(_amount > 0, "Amount must be greater than 0");

        uint256 userBalance = userSharesInRound[_msgSender()][currentRound];
        require(
            userBalance >= _amount,
            "Not enough buyer tokens for you to redeem"
        );

        buyerToken.safeTransfer(_msgSender(), _amount);

        userSharesInRound[_msgSender()][currentRound] -= _amount;

        if (userSharesInRound[_msgSender()][currentRound] == 0) {
            userInfo[_msgSender()].pendingRounds.pop();
        }

        roundInfo[currentRound].shares -= _amount;

        emit Redeem(_msgSender(), currentRound, _amount);
    }

    /**
     * @notice Setttle the current round
     * @dev Callable by any address, must pass the distribution interval
     */
    function settleCurrentRound() external hasPassedInterval whenNotPaused {
        RoundInfo storage info = roundInfo[currentRound];
        require(!info.hasDistributed, "Already distributed");

        uint256 totalShares = info.shares;

        // If no one staked, no reward
        if (totalShares == 0) info.degisPerShare = 0;
        else info.degisPerShare = degisPerRound.div(totalShares);

        info.hasDistributed = true;

        emit RoundSettled(currentRound, block.timestamp);

        currentRound += 1;
        lastDistribution = block.timestamp;
    }

    /**
     * @notice User can claim his own reward
     */
    function claimOwnReward() external nonReentrant whenNotPaused {
        UserInfo memory user = userInfo[_msgSender()];

        require(user.pendingRounds.length != 0, "You have no shares ever");

        uint256 roundsToClaim = user.pendingRounds.length -
            user.lastRewardRoundIndex;

        require(roundsToClaim > 0, "Have claimed all");

        if (user.pendingRounds[user.pendingRounds.length - 1] == currentRound) {
            roundsToClaim -= 1;
        }

        if (roundsToClaim > MAX_ROUND) {
            roundsToClaim = MAX_ROUND;

            userInfo[_msgSender()].lastRewardRoundIndex += MAX_ROUND;
        } else userInfo[_msgSender()].lastRewardRoundIndex += roundsToClaim;

        uint256 userPendingReward;
        uint256 startIndex = user.lastRewardRoundIndex;

        for (uint256 i = startIndex; i < startIndex + roundsToClaim; i++) {
            uint256 round = user.pendingRounds[i];

            userPendingReward += roundInfo[round].degisPerShare.mul(
                userSharesInRound[_msgSender()][round]
            );
        }

        degis.mintDegis(_msgSender(), userPendingReward);
    }
}
