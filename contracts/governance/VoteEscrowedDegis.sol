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

import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { VeERC20Upgradeable } from "./VeERC20Upgradeable.sol";
import { Math } from "../libraries/Math.sol";

import { IFarmingPool } from "../farming/interfaces/IFarmingPool.sol";

/**
 * @title Vote Escrowed Degis
 * @notice The staking contract for DEG -> veDEG
 *         veDEG:
 *            - Boosting the farming reward
 *            - Governance
 *            - Participate in Initial Liquidity Matching (naughty price)
 *            - etc.
 *         If you stake degis, you generate veDEG at the current `generationRate` until you reach `maxCap`
 *         If you unstake any amount of degis, you will lose all of your veDEG tokens
 *
 *         There is also an option that you lock your DEG for the max time
 *         and get the maximum veDEG balance immediately.
 *         !! Attention !!
 *         If you stake DEG for the max time for more than once, the lockUntil timestamp will
 *         be updated to the latest one.
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
        // Amount locked for max time
        uint256 amountLocked;
        // Lock until timestamp
        uint256 lockUntil;
    }

    // User info
    mapping(address => UserInfo) public users;

    // Degis token
    // IERC20 public constant degis =
    //     IERC20(0x9f285507Ea5B4F33822CA7aBb5EC8953ce37A645);
    IERC20 public degis;

    // Farming pool
    IFarmingPool public farmingPool;

    // Max veDEG to staked degis ratio
    // Max veDEG amount = maxCap * degis staked
    uint256 public maxCapRatio;

    // Rate of veDEG generated per second, per degis staked
    uint256 public generationRate;

    // Calculation scale
    uint256 public constant SCALE = 1e18;

    // Whitelist contract checker
    // Contract addresses are by default unable to stake degis, they must be whitelisted
    mapping(address => bool) whitelist;

    // Locked amount
    mapping(address => uint256) public locked;

    // NFT Staking contract
    address public nftStaking;

    mapping(address => uint256) public boosted;

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Events ***************************************** //
    // ---------------------------------------------------------------------------------------- //
    event GenerationRateChanged(uint256 oldRate, uint256 newRate);
    event MaxCapRatioChanged(uint256 oldMaxCapRatio, uint256 newMaxCapRatio);
    event WhiteListAdded(address newWhiteList);
    event WhiteListRemoved(address oldWhiteList);

    event Deposit(address indexed user, uint256 amount);
    event DepositMaxTime(
        address indexed user,
        uint256 amount,
        uint256 lockUntil
    );
    event Withdraw(address indexed user, uint256 amount);

    event Claimed(address indexed user, uint256 amount);

    event BurnVeDEG(
        address indexed caller,
        address indexed user,
        uint256 amount
    );

    event LockVeDEG(
        address indexed caller,
        address indexed user,
        uint256 amount
    );

    event UnlockVeDEG(
        address indexed caller,
        address indexed user,
        uint256 amount
    );

    event NFTStakingChanged(address oldNFTStaking, address newNFTStaking);
    event BoostVeDEG(address user, uint256 boostType);
    event UnBoostVeDEG(address user);

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Errors ***************************************** //
    // ---------------------------------------------------------------------------------------- //

    error VED__NotWhiteListed();
    error VED__StillLocked();
    error VED__ZeroAddress();
    error VED__ZeroAmount();
    error VED__NotEnoughBalance();

    error VED__TimeNotPassed();
    error VED__OverLocked();

    error VED__NotNftStaking();

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //

    function initialize(address _degis, address _farmingPool)
        public
        initializer
    {
        if (_degis == address(0) || _farmingPool == address(0))
            revert VED__ZeroAddress();

        // Initialize veDEG
        __ERC20_init("Vote Escrowed Degis", "veDEG");
        __Ownable_init();
        __ReentrancyGuard_init_unchained();
        __Pausable_init_unchained();

        // Set generationRate (veDEG per sec per degis staked)
        generationRate = 10**18;

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

    /**
     * @notice Not callable by smart contract
     * @dev Checked first by msg.sender == tx.origin
     *      Then if the contract is whitelisted, it will still pass the check
     */
    modifier notContract(address _addr) {
        if (_addr != tx.origin) {
            if (!whitelist[_addr]) revert VED__NotWhiteListed();
        }
        _;
    }

    /**
     * @notice No locked veDEG
     * @dev Check the locked balance of a user
     */
    modifier noLocked(address _user) {
        if (locked[_user] > 0) revert VED__StillLocked();
        _;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ View Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Calculate the amount of veDEG that can be claimed by user
     * @param _user User address
     * @return claimableAmount Claimable amount of the user
     */
    function claimable(address _user) public view returns (uint256) {
        if (_user == address(0)) revert VED__ZeroAddress();

        UserInfo memory user = users[_user];

        // Seconds passed since last claim
        uint256 timePassed = block.timestamp - user.lastRelease;

        uint256 realCapRatio = _getCapRatio(_user);

        uint256 pending;
        // Calculate pending amount
        uint256 boostType = boosted[_user];
        // If no boost
        if (boostType == 0) {
            pending = Math.wmul(user.amount, timePassed * generationRate);
        }
        // Normal nft boost
        else if (boostType == 1) {
            pending = Math.wmul(
                user.amount,
                (timePassed * generationRate * 120) / 100
            );
        }
        // Rare nft boost
        else if (boostType == 2) {
            pending = Math.wmul(
                user.amount,
                (timePassed * generationRate * 150) / 100
            );
        }

        // get user's veDEG balance
        uint256 userVeDEGBalance = balanceOf(_user) -
            user.amountLocked *
            realCapRatio;

        // user veDEG balance cannot go above user.amount * maxCap
        uint256 veDEGCap = user.amount * realCapRatio;

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
     * @dev Only callable by the owner
     * @param _account Address to add
     */
    function addWhitelist(address _account) external onlyOwner {
        whitelist[_account] = true;
        emit WhiteListAdded(_account);
    }

    /**
     * @notice Remove a new whitelist address
     * @dev Only callable by the owner
     * @param _account Address to remove
     */
    function removeWhitelist(address _account) external onlyOwner {
        whitelist[_account] = false;
        emit WhiteListRemoved(_account);
    }

    /**
     * @notice Set maxCap ratio
     * @param _maxCapRatio the new max ratio
     */
    function setMaxCapRatio(uint256 _maxCapRatio) external onlyOwner {
        if (_maxCapRatio == 0) revert VED__ZeroAmount();
        emit MaxCapRatioChanged(maxCapRatio, _maxCapRatio);
        maxCapRatio = _maxCapRatio;
    }

    /**
     * @notice Set generationRate
     * @param _generationRate New generation rate
     */
    function setGenerationRate(uint256 _generationRate) external onlyOwner {
        if (_generationRate == 0) revert VED__ZeroAmount();
        emit GenerationRateChanged(generationRate, _generationRate);
        generationRate = _generationRate;
    }

    function setNFTStaking(address _nftStaking) external onlyOwner {
        emit NFTStakingChanged(nftStaking, _nftStaking);
        nftStaking = _nftStaking;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Depisit degis for veDEG
     * @dev Only EOA or whitelisted contract address
     * @param _amount Amount to deposit
     */
    function deposit(uint256 _amount)
        external
        nonReentrant
        whenNotPaused
        notContract(msg.sender)
    {
        if (_amount == 0) revert VED__ZeroAmount();

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

        emit Deposit(msg.sender, _amount);
    }

    /**
     * @notice Deposit for the max time
     * @dev Release the max amount one time
     */
    function depositMaxTime(uint256 _amount)
        external
        nonReentrant
        whenNotPaused
    {
        if (_amount == 0) revert VED__ZeroAmount();

        uint256 currentMaxTime = (maxCapRatio * SCALE) / generationRate;
        uint256 lockUntil = block.timestamp + currentMaxTime * 2;

        users[msg.sender].amountLocked += _amount;
        users[msg.sender].lockUntil = lockUntil;

        // Request degis from user
        degis.safeTransferFrom(msg.sender, address(this), _amount);

        uint256 realCapRatio = _getCapRatio(msg.sender);

        _mint(msg.sender, realCapRatio * _amount);

        emit DepositMaxTime(msg.sender, _amount, lockUntil);
    }

    /**
     * @notice Claims accumulated veDEG for flex deposit
     */
    function claim() public nonReentrant whenNotPaused {
        if (users[msg.sender].amount == 0) revert VED__ZeroAmount();

        _claim(msg.sender);
    }

    /**
     * @notice Withdraw degis token
     * @dev User will lose all veDEG once he withdrawed
     * @param _amount Amount to withdraw
     */
    function withdraw(uint256 _amount)
        external
        nonReentrant
        whenNotPaused
        noLocked(msg.sender)
    {
        if (_amount == 0) revert VED__ZeroAmount();

        UserInfo storage user = users[msg.sender];
        if (user.amount < _amount) revert VED__NotEnoughBalance();

        // reset last Release timestamp
        user.lastRelease = block.timestamp;

        // update his balance before burning or sending back degis
        user.amount -= _amount;

        // get user veDEG balance that must be burned
        // those locked amount will not be calculated

        uint256 realCapRatio = _getCapRatio(msg.sender);

        uint256 userVeDEGBalance = balanceOf(msg.sender) -
            user.amountLocked *
            realCapRatio;

        _burn(msg.sender, userVeDEGBalance);

        // send back the staked degis
        degis.safeTransfer(msg.sender, _amount);

        emit Withdraw(msg.sender, _amount);
    }

    /**
     * @notice Withdraw all the locked veDEG
     */
    function withdrawLocked()
        external
        nonReentrant
        whenNotPaused
        noLocked(msg.sender)
    {
        UserInfo memory user = users[msg.sender];

        if (user.amountLocked == 0) revert VED__ZeroAmount();
        if (block.timestamp < user.lockUntil) revert VED__TimeNotPassed();

        uint256 realCapRatio = _getCapRatio(msg.sender);

        _burn(msg.sender, user.amountLocked * realCapRatio);

        // update his balance before burning or sending back degis
        users[msg.sender].amountLocked = 0;
        users[msg.sender].lockUntil = 0;

        // send back the staked degis
        degis.safeTransfer(msg.sender, user.amountLocked);
    }

    /**
     * @notice Lock veDEG token
     * @dev Only whitelisted contract
     *      Income sharing contract will lock veDEG as entrance
     * @param _to User address
     * @param _amount Amount to lock
     */
    function lockVeDEG(address _to, uint256 _amount) external {
        // Only whitelisted contract can lock veDEG
        if (!whitelist[msg.sender]) revert VED__NotWhiteListed();

        if (locked[_to] + _amount > balanceOf(_to)) revert VED__OverLocked();

        _lock(_to, _amount);
        emit LockVeDEG(msg.sender, _to, _amount);
    }

    /**
     * @notice Unlock veDEG token
     * @param _to User address
     * @param _amount Amount to unlock
     */
    function unlockVeDEG(address _to, uint256 _amount) external {
        // Only whitelisted contract can unlock veDEG
        if (!whitelist[msg.sender]) revert VED__NotWhiteListed();

        if (locked[_to] < _amount) revert VED__OverLocked();

        _unlock(_to, _amount);
        emit UnlockVeDEG(msg.sender, _to, _amount);
    }

    /**
     * @notice Burn veDEG
     * @dev Only whitelisted contract
     *      For future use, some contracts may need veDEG for entrance
     * @param _to Address to burn
     * @param _amount Amount to burn
     */
    function burnVeDEG(address _to, uint256 _amount) public {
        // Only whitelisted contract can burn veDEG
        if (!whitelist[msg.sender]) revert VED__NotWhiteListed();

        _burn(_to, _amount);
        emit BurnVeDEG(msg.sender, _to, _amount);
    }

    /**
     * @notice Boost veDEG
     *
     * @dev Only called by nftStaking contract
     *
     * @param _user User address
     * @param _type Boost type (1 = 120%, 2 = 150%)
     */
    function boostVeDEG(address _user, uint256 _type) external {
        if (msg.sender != nftStaking) revert VED__NotNftStaking();

        require(_type == 1 || _type == 2);

        boosted[_user] = _type;

        uint256 boostRatio;

        if (_type == 1) boostRatio = 20;
        else if (_type == 2) boostRatio = 50;

        uint256 userBalance = balanceOf(_user);

        if (userBalance > 0) {
            _mint(_user, (userBalance * boostRatio) / 100);
        }

        emit BoostVeDEG(_user, _type);
    }

    /**
     * @notice UnBoost veDEG
     *
     * @dev Only called by nftStaking contract
     *
     * @param _user User address
     */
    function unBoostVeDEG(address _user) external {
        if (msg.sender != nftStaking) revert VED__NotNftStaking();

        uint256 currentBoostStatus = boosted[_user];

        if (currentBoostStatus == 0) return;

        uint256 userBalance = balanceOf(_user);
        uint256 userLocked = locked[_user];

        if (currentBoostStatus == 1) {
            if (userLocked > 0) revert VED__StillLocked();
            _burn(_user, (userBalance * 20) / 120);
        } else if (currentBoostStatus == 2) {
            if (userLocked > 0) revert VED__StillLocked();
            _burn(_user, (userBalance * 50) / 150);
        }

        boosted[_user] = 0;

        emit UnBoostVeDEG(_user);
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

    /**
     * @notice Lock veDEG token
     * @param _to User address
     * @param _amount Amount to lock
     */
    function _lock(address _to, uint256 _amount) internal {
        locked[_to] += _amount;
    }

    /**
     * @notice Unlock veDEG token
     * @param _to User address
     * @param _amount Amount to unlock
     */
    function _unlock(address _to, uint256 _amount) internal {
        if (locked[_to] < _amount) revert VED__NotEnoughBalance();
        locked[_to] -= _amount;
    }

    /**
     * @notice Get real cap ratio for a user
     *         The ratio depends on the boost type
     *
     * @param _user User address
     *
     * @return realCapRatio Real cap ratio
     */
    function _getCapRatio(address _user)
        internal
        view
        returns (uint256 realCapRatio)
    {
        uint256 boostType = boosted[_user];
        if (boostType == 0) {
            realCapRatio = maxCapRatio;
        } else if (boostType == 1) {
            realCapRatio = (maxCapRatio * 120) / 100;
        } else if (boostType == 2) {
            realCapRatio = (maxCapRatio * 150) / 100;
        }
    }
}
