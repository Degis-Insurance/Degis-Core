// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./tokens/interfaces/IBuyerToken.sol";
import "./tokens/interfaces/IDegisToken.sol";
import "./utils/Ownable.sol";

/**
 * @title  Purchase Incentive Vault
 * @notice This is the purchase incentive vault for staking buyer tokens.
 *         Users first stake their buyer tokens and wait for distribution.
 *         About every 24 hours, the reward will be calculated to users' account.
 *         After disrtribution, users' reward balance will update but they still need to manually claim the reward.
 */
contract PurchaseInventiveVault is Ownable {
    using SafeERC20 for IBuyerToken;

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
    uint256 public lastDistributionBlock;

    uint256 currentDistributionIndex;

    // Round number => Total shares(buyer tokens)
    mapping(uint256 => uint256) public sharesInRound;

    // Round number => User address list
    mapping(uint256 => address[]) public usersInRound;

    // Round number => Whether has been distributed
    mapping(uint256 => bool) public hasDistributed;

    // User address => Round number => User shares
    mapping(address => mapping(uint256 => uint256)) public userSharesInRound;

    // User address => Pending rewards
    mapping(address => uint256) public userRewards;

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Events ***************************************** //
    // ---------------------------------------------------------------------------------------- //

    event DegisPerRoundChanged(uint256 oldPerRound, uint256 newPerRound);
    event DistributionIntervalChanged(uint256 oldInterval, uint256 newInterval);
    event RewardClaimed(address userAddress, uint256 userReward);

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //

    constructor(address _buyerToken, address _degisToken) {
        // Initialize two tokens
        buyerToken = IBuyerToken(_buyerToken);
        degis = IDegisToken(_degisToken);

        // Initialize the last distribution block
        lastDistributionBlock = block.number;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************** Modifiers *************************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Check if admins can distribute at this time
     */
    modifier hasPassedInterval() {
        require(
            block.number - lastDistributionBlock > distributionInterval,
            "Two distributions need to have an interval "
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
        return usersInRound[_round].length;
    }

    /**
     * @notice Get your shares in the current round
     * @param _userAddress Address of the user
     */
    function getUserShares(address _userAddress) public view returns (uint256) {
        return userSharesInRound[_userAddress][currentRound];
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Set Functions ************************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Set degis distribution per round
     * @param _degisPerRound Degis distribution per round to be set
     */
    function setDegisPerRound(uint256 _degisPerRound) external onlyOwner {
        uint256 oldPerRound = degisPerRound;
        degisPerRound = _degisPerRound;
        emit DegisPerRoundChanged(oldPerRound, _degisPerRound);
    }

    /**
     * @notice Set a new distribution interval
     * @param _newInterval The new interval
     */
    function setDistributionInterval(uint256 _newInterval) external onlyOwner {
        uint256 oldInterval = distributionInterval;
        distributionInterval = _newInterval;
        emit DistributionIntervalChanged(oldInterval, _newInterval);
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Stake buyer tokens into this contract
     * @param _amount Amount of buyer tokens to stake
     */
    function stake(uint256 _amount) external {
        buyerToken.safeTransferFrom(msg.sender, address(this), _amount);

        if (userSharesInRound[msg.sender][currentRound] == 0) {
            usersInRound[currentRound].push(msg.sender);
        }

        userSharesInRound[msg.sender][currentRound] += _amount;
        sharesInRound[currentRound] += _amount;
    }

    /**
     * @notice Redeem buyer token from the vault
     * @param _amount Amount to redeem
     */
    function redeem(uint256 _amount) external {
        uint256 userBalance = userSharesInRound[msg.sender][currentRound];
        require(
            userBalance >= _amount,
            "Not enough buyer tokens for you to redeem"
        );

        buyerToken.safeTransfer(msg.sender, _amount);

        if (userSharesInRound[msg.sender][currentRound] == 0) {
            delete userSharesInRound[msg.sender][currentRound];
        }

        userSharesInRound[msg.sender][currentRound] -= _amount;
        sharesInRound[currentRound] -= _amount;
    }

    /**
     * @notice Distribute the reward in this round, the total number depends on the blocks during this period
     * @param _startIndex Distribution start index
     * @param _stopIndex Distribution stop index
     */
    function distributeReward(uint256 _startIndex, uint256 _stopIndex)
        external
        onlyOwner
        hasPassedInterval
    {
        require(
            degisPerRound > 0,
            "Currently no Degis reward, please set degisPerRound first"
        );
        require(
            hasDistributed[currentRound] == false,
            "Current round has been distributed"
        );

        uint256 totalShares = sharesInRound[currentRound];
        uint256 degisPerShare = (degisPerRound * 1e18) / totalShares;

        uint256 length = getTotalUsersInRound(currentRound);

        // Distribute all at once
        // Maybe not enough gas in one tx, the judgement should be done by backend)
        if (_startIndex == 0 && _stopIndex == 0) {
            _distributeReward(currentRound, 0, length, degisPerShare);
            currentDistributionIndex = length;
        }
        // Distribute in a certain range (need several times distribution)
        else {
            // Check if you start from the last check point
            require(
                currentDistributionIndex == _startIndex,
                "You need to start from the last distribution point"
            );
            // Check if the stopindex exceeds the length
            _stopIndex = _stopIndex > length ? length : _stopIndex;

            if (_stopIndex != 0) {
                _distributeReward(
                    currentRound,
                    _startIndex,
                    _stopIndex,
                    degisPerShare
                );
            }

            currentDistributionIndex = _stopIndex;
        }

        if (currentDistributionIndex == length) {
            _finishDistribution();
        }
    }

    /**
     * @notice Users need to claim their overall rewards
     */
    function claimReward() external {
        uint256 userReward = userRewards[msg.sender];

        require(userReward > 0, "You do not have any rewards to claim");

        degis.mintDegis(msg.sender, userReward);

        delete userRewards[msg.sender];

        emit RewardClaimed(msg.sender, userReward);
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Internal Functions ********************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Finish the distribution process
     * @param _round Distribution round
     * @param _startIndex Start index
     * @param _stopIndex Stop index
     * @param _degisPerShare Amount of degis per share
     */
    function _distributeReward(
        uint256 _round,
        uint256 _startIndex,
        uint256 _stopIndex,
        uint256 _degisPerShare
    ) internal {
        for (uint256 i = _startIndex; i < _stopIndex; i++) {
            address userAddress = usersInRound[_round][i];
            uint256 userShares = userSharesInRound[userAddress][_round];

            buyerToken.burnBuyerToken(address(this), userShares);

            if (userShares != 0) {
                // Update the pending reward of a user
                userRewards[userAddress] +=
                    (userShares * _degisPerShare) /
                    1e18;
                delete userSharesInRound[userAddress][_round];
            } else continue;
        }
    }

    /**
     * @notice Finish the distribution process and move to next round
     */
    function _finishDistribution() internal {
        currentDistributionIndex = 0;
        hasDistributed[currentRound] = true;
        currentRound += 1;
        lastDistributionBlock = block.number;
    }
}
