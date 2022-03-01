// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./VeERC20Upgradeable.sol";
import "./Whitelist.sol";
import "./libraries/Math.sol";

/// @title Vote Escrowed Degis
/// @notice The staking contract for DEG -> veDEG, also the token used for governance.
/// If you stake degis, you generate veDEG at the current `generationRate` until you reach `maxCap`
/// If you unstake any amount of degis, you loose all of your veDEG.
/// ERC721 staking does not affect generation nor cap for the moment, but it will in a future upgrade.
/// Note that it's ownable and the owner wields tremendous power. The ownership
/// will be transferred to a governance smart contract once Platypus is sufficiently
/// distributed and the community can show to govern itself.
contract VoteEscrowedDegis is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    VeERC20Upgradeable
{
    using SafeERC20 for IERC20;

    struct UserInfo {
        uint256 amount; // degis staked by user
        uint256 lastRelease; // time of last veDEG claim or first deposit if user has not claimed yet
        // the id of the currently staked nft
        // important: the id is offset by +1 to handle tokenID = 0
        uint256 stakedNftId;
    }

    /// @notice the degis token
    IERC20 public degis;

    /// @dev Magic value for onERC721Received
    /// Equals to bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))
    bytes4 private constant ERC721_RECEIVED = 0x150b7a02;

    /// @notice max veDEG to staked degis ratio
    /// Note if user has 10 degis staked, they can only have a max of 10 * maxCap veDEG in balance
    uint256 public maxCap;

    /// @notice the rate of veDEG generated per second, per degis staked
    uint256 public generationRate;

    /// @notice invVvoteThreshold threshold.
    /// @notice voteThreshold is the tercentage of cap from which votes starts to count for governance proposals.
    /// @dev inverse of the threshold to apply.
    /// Example: th = 5% => (1/5) * 100 => invVoteThreshold = 20
    /// Example 2: th = 3.03% => (1/3.03) * 100 => invVoteThreshold = 33
    /// Formula is invVoteThreshold = (1 / th) * 100
    uint256 public invVoteThreshold;

    /// @notice whitelist wallet checker
    /// @dev contract addresses are by default unable to stake degis, they must be previously whitelisted to stake degis
    Whitelist public whitelist;

    /// @notice user info mapping
    mapping(address => UserInfo) public users;

    /// @notice events describing staking, unstaking and claiming
    event Staked(address indexed user, uint256 indexed amount);
    event Unstaked(address indexed user, uint256 indexed amount);
    event Claimed(address indexed user, uint256 indexed amount);

    /// @notice events describing NFT staking and unstaking
    event StakedNft(address indexed user, uint256 indexed nftId);
    event UnstakedNft(address indexed user, uint256 indexed nftId);

    function initialize(IERC20 _degis) public initializer {
        require(address(_degis) != address(0), "zero address");

        // Initialize veDEG
        __ERC20_init("Platypus Venom", "veDEG");
        __Ownable_init();
        __ReentrancyGuard_init_unchained();
        __Pausable_init_unchained();

        // set generationRate (veDEG per sec per degis staked)
        generationRate = 3888888888888;

        // set maxCap
        maxCap = 100;

        // set inv vote threshold
        // invVoteThreshold = 20 => th = 5
        invVoteThreshold = 20;

        // set degis
        degis = _degis;
    }

    /**
     * @dev pause pool, restricting certain operations
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev unpause pool, enabling certain operations
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice sets whitelist address
    /// @param _whitelist the new whitelist address
    function setWhitelist(Whitelist _whitelist) external onlyOwner {
        require(address(_whitelist) != address(0), "zero address");
        whitelist = _whitelist;
    }

    /// @notice sets maxCap
    /// @param _maxCap the new max ratio
    function setMaxCap(uint256 _maxCap) external onlyOwner {
        require(_maxCap != 0, "max cap cannot be zero");
        maxCap = _maxCap;
    }

    /// @notice sets generation rate
    /// @param _generationRate the new max ratio
    function setGenerationRate(uint256 _generationRate) external onlyOwner {
        require(_generationRate != 0, "generation rate cannot be zero");
        generationRate = _generationRate;
    }

    /// @notice sets invVoteThreshold
    /// @param _invVoteThreshold the new var
    /// Formula is invVoteThreshold = (1 / th) * 100
    function setInvVoteThreshold(uint256 _invVoteThreshold) external onlyOwner {
        // onwner should set a high value if we do not want to implement an important threshold
        require(_invVoteThreshold != 0, "invVoteThreshold cannot be zero");
        invVoteThreshold = _invVoteThreshold;
    }

    /// @notice checks wether user _addr has degis staked
    /// @param _addr the user address to check
    /// @return true if the user has degis in stake, false otherwise
    function isUser(address _addr) public view returns (bool) {
        return users[_addr].amount > 0;
    }

    /// @notice returns staked amount of degis for user
    /// @param _addr the user address to check
    /// @return staked amount of degis
    function getStakeddegis(address _addr) external view returns (uint256) {
        return users[_addr].amount;
    }

    /// @dev explicity override multiple inheritance
    function totalSupply()
        public
        view
        override(VeERC20Upgradeable)
        returns (uint256)
    {
        return super.totalSupply();
    }

    /// @dev explicity override multiple inheritance
    function balanceOf(address account)
        public
        view
        override(VeERC20Upgradeable)
        returns (uint256)
    {
        return super.balanceOf(account);
    }

    /// @notice deposits degis into contract
    /// @param _amount the amount of degis to deposit
    function deposit(uint256 _amount) external nonReentrant whenNotPaused {
        require(_amount > 0, "amount to deposit cannot be zero");

        // assert call is not coming from a smart contract
        // unless it is whitelisted
        _assertNotContract(msg.sender);

        if (isUser(msg.sender)) {
            // if user exists, first, claim his veDEG
            _claim(msg.sender);
            // then, increment his holdings
            users[msg.sender].amount += _amount;
        } else {
            // add new user to mapping
            users[msg.sender].lastRelease = block.timestamp;
            users[msg.sender].amount = _amount;
        }

        // Request degis from user
        degis.safeTransferFrom(msg.sender, address(this), _amount);
    }

    /// @notice asserts addres in param is not a smart contract.
    /// @notice if it is a smart contract, check that it is whitelisted
    /// @param _addr the address to check
    function _assertNotContract(address _addr) private view {
        if (_addr != tx.origin) {
            require(
                address(whitelist) != address(0) && whitelist.check(_addr),
                "Smart contract depositors not allowed"
            );
        }
    }

    /// @notice claims accumulated veDEG
    function claim() external nonReentrant whenNotPaused {
        require(isUser(msg.sender), "user has no stake");
        _claim(msg.sender);
    }

    /// @dev private claim function
    /// @param _addr the address of the user to claim from
    function _claim(address _addr) private {
        uint256 amount = _claimable(_addr);

        // update last release time
        users[_addr].lastRelease = block.timestamp;

        if (amount > 0) {
            emit Claimed(_addr, amount);
            _mint(_addr, amount);
        }
    }

    /// @notice Calculate the amount of veDEG that can be claimed by user
    /// @param _addr the address to check
    /// @return amount of veDEG that can be claimed by user
    function claimable(address _addr) external view returns (uint256) {
        require(_addr != address(0), "zero address");
        return _claimable(_addr);
    }

    /// @dev private claim function
    /// @param _addr the address of the user to claim from
    function _claimable(address _addr) private view returns (uint256) {
        UserInfo storage user = users[_addr];

        // get seconds elapsed since last claim
        uint256 secondsElapsed = block.timestamp - user.lastRelease;

        // calculate pending amount
        // Math.mwmul used to multiply wad numbers
        uint256 pending = Math.wmul(
            user.amount,
            secondsElapsed * generationRate
        );

        // get user's veDEG balance
        uint256 userVeDEGBalance = balanceOf(_addr);

        // user veDEG balance cannot go above user.amount * maxCap
        uint256 maxVeDEGCap = user.amount * maxCap;

        // first, check that user hasn't reached the max limit yet
        if (userVeDEGBalance < maxVeDEGCap) {
            // then, check if pending amount will make user balance overpass maximum amount
            if ((userVeDEGBalance + pending) > maxVeDEGCap) {
                return maxVeDEGCap - userVeDEGBalance;
            } else {
                return pending;
            }
        }
        return 0;
    }

    /// @notice withdraws staked degis
    /// @param _amount the amount of degis to unstake
    /// Note Beware! you will loose all of your veDEG if you unstake any amount of degis!
    function withdraw(uint256 _amount) external nonReentrant whenNotPaused {
        require(_amount > 0, "amount to withdraw cannot be zero");
        require(users[msg.sender].amount >= _amount, "not enough balance");

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

    /// @notice get votes for veDEG
    /// @dev votes should only count if account has > threshold% of current cap reached
    /// @dev invVoteThreshold = (1/threshold%)*100
    /// @return the valid votes
    function getVotes(address _account)
        external
        view
        virtual
        returns (uint256)
    {
        uint256 veDEGBalance = balanceOf(_account);

        // check that user has more than voting treshold of maxCap and has degis in stake
        if (
            veDEGBalance * invVoteThreshold > users[_account].amount * maxCap &&
            isUser(_account)
        ) {
            return veDEGBalance;
        } else {
            return 0;
        }
    }
}
