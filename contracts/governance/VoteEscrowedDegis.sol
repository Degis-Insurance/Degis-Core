// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./VeERC20Upgradeable.sol";
import {Math} from "./libraries/Math.sol";

import {IFarmingPool} from "../farming/interfaces/IFarmingPool.sol";

/**
 * @title Vote Escrowed Degis
 * @notice The staking contract for DEG -> veDEG
 *         VeDEG:
 *            - Boosting the farming reward
 *            - Governance
 *         If you stake degis, you generate veDEG at the current `generationRate` until you reach `maxCap`
 *         If you unstake any amount of degis, you will lose all of your veDEG tokens
 */
contract VoteEscrowedDegis is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    VeERC20Upgradeable
{
    using SafeERC20 for IERC20;

    struct UserInfo {
        // degis staked by user
        uint256 amount;
        // time of last veDEG claim or first deposit if user has not claimed yet
        uint256 lastRelease;
    }

    // Degis token
    // IERC20 public constant degis =
    //     IERC20(0x9f285507Ea5B4F33822CA7aBb5EC8953ce37A645);
    IERC20 public degis;

    // Farming pool
    IFarmingPool farmingPool;

    // Max veDEG to staked degis ratio
    // Max veDEG amount = maxCap * degis staked
    uint256 public maxCapRatio;

    // Rate of veDEG generated per second, per degis staked
    uint256 public generationRate;

    // Whitelist contract checker
    // Contract addresses are by default unable to stake degis, they must be whitelisted
    mapping(address => bool) whitelist;

    // User info
    mapping(address => UserInfo) public users;

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Events ***************************************** //
    // ---------------------------------------------------------------------------------------- //

    event Staked(address indexed user, uint256 indexed amount);
    event Unstaked(address indexed user, uint256 indexed amount);
    event Claimed(address indexed user, uint256 indexed amount);

    /// @notice events describing NFT staking and unstaking
    event StakedNft(address indexed user, uint256 indexed nftId);
    event UnstakedNft(address indexed user, uint256 indexed nftId);

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //

    function initialize(address _degis, address _farmingPool)
        public
        initializer
    {
        require(address(_degis) != address(0), "zero address");

        // Initialize veDEG
        __ERC20_init("Vote Escrowed DEG", "veDEG");
        __Ownable_init();
        __ReentrancyGuard_init_unchained();
        __Pausable_init_unchained();

        // Set generationRate (veDEG per sec per degis staked)
        generationRate = 10**15;

        // Set maxCap ratio
        maxCapRatio = 100;

        // Set degis
        degis = IERC20(_degis);

        // Set farming pool
        farmingPool = IFarmingPool(_farmingPool);
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************** Modifiers *************************************** //
    // ---------------------------------------------------------------------------------------- //

    modifier notContract(address _addr) {
        if (_addr != tx.origin) {
            require(whitelist[_addr], "Not whitelisted");
        }
        _;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ View Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Calculate the amount of veDEG that can be claimed by user
     * @param _user User address
     */
    function claimable(address _user) public view returns (uint256) {
        require(_user != address(0), "zero address");

        UserInfo memory user = users[_user];

        // Seconds passed since last claim
        uint256 timePassed = block.timestamp - user.lastRelease;

        // calculate pending amount
        uint256 pending = Math.wmul(user.amount, timePassed * generationRate);

        // get user's veDEG balance
        uint256 userVeDEGBalance = balanceOf(_user);

        // user veDEG balance cannot go above user.amount * maxCap
        uint256 veDEGCap = user.amount * maxCapRatio;

        // first, check that user hasn't reached the max limit yet
        if (userVeDEGBalance < veDEGCap) {
            // then, check if pending amount will make user balance overpass maximum amount
            if (userVeDEGBalance + pending > veDEGCap) {
                return veDEGCap - userVeDEGBalance;
            } else {
                return pending;
            }
        }
        return 0;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Set Functions ************************************* //
    // ---------------------------------------------------------------------------------------- //

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Add a new whitelist address
     */
    function addWhitelist(address _account) external onlyOwner {
        whitelist[_account] = true;
    }

    /**
     * @notice Remove a new whitelist address
     */
    function removeWhitelist(address _account) external onlyOwner {
        whitelist[_account] = false;
    }

    /**
     * @notice Set maxCap ratio
     * @param _maxCapRatio the new max ratio
     */
    function setMaxCapRatio(uint256 _maxCapRatio) external onlyOwner {
        require(_maxCapRatio > 0, "Max cap ratio should be greater than zero");
        maxCapRatio = _maxCapRatio;
    }

    /**
     * @notice Set generationRate
     * @param _generationRate the new generation rate
     */
    function setGenerationRate(uint256 _generationRate) external onlyOwner {
        require(
            _generationRate > 0,
            "Generation rate should be greater than 0"
        );
        generationRate = _generationRate;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Depisit degis for veDEG
     * @param _amount Amount to deposit
     */
    function deposit(uint256 _amount)
        external
        nonReentrant
        whenNotPaused
        notContract(msg.sender)
    {
        require(_amount > 0, "Zero amount");

        if (users[msg.sender].amount > 0) {
            // If the user has amount deposited, claim veDEG
            _claim(msg.sender);

            // Update the amount
            users[msg.sender].amount += _amount;
        } else {
            // add new user to mapping
            users[msg.sender].lastRelease = block.timestamp;
            users[msg.sender].amount = _amount;
        }

        // Request degis from user
        degis.safeTransferFrom(msg.sender, address(this), _amount);
    }

    /// @notice claims accumulated veDEG
    function claim() public nonReentrant whenNotPaused {
        require(users[msg.sender].amount > 0, "user has no stake");

        _claim(msg.sender);
    }

    /**
     * @notice Withdraw degis token
     * @dev User will lose all veDEG once he withdrawed
     * @param _amount Amount to withdraw
     */
    function withdraw(uint256 _amount) external nonReentrant whenNotPaused {
        require(_amount > 0, "Amount should be greater than zero");
        require(users[msg.sender].amount >= _amount, "Not enough balance");

        // reset last Release timestamp
        users[msg.sender].lastRelease = block.timestamp;

        // update his balance before burning or sending back degis
        users[msg.sender].amount -= _amount;

        // get user veDEG balance that must be burned
        uint256 userVeDEGBalance = balanceOf(msg.sender);

        _burn(msg.sender, userVeDEGBalance);

        // send back the staked degis
        degis.safeTransfer(msg.sender, _amount);
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Internal Functions ********************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Finish claiming veDEG
     * @param _user User address
     */
    function _claim(address _user) internal {
        uint256 amount = claimable(_user);

        // update last release time
        users[_user].lastRelease = block.timestamp;

        if (amount > 0) {
            emit Claimed(_user, amount);
            _mint(_user, amount);
        }
    }

    /**
     * @notice Update the bonus in farming pool
     * @dev Every time when token is transferred (balance change)
     * @param _user User address
     * @param _newBalance New veDEG balance
     */
    function _afterTokenOperation(address _user, uint256 _newBalance)
        internal
        override
    {
        farmingPool.updateBonus(_user, _newBalance);
    }
}
