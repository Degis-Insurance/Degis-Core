// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Decimals} from "../utils/interfaces/IERC20Decimals.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IPolicyCore} from "../naughty-price/interfaces/IPolicyCore.sol";
import {INaughtyRouter} from "../naughty-price/interfaces/INaughtyRouter.sol";
import {INaughtyPair} from "../naughty-price/interfaces/INaughtyPair.sol";
import {ILMToken as LPToken} from "./ILMToken.sol";

/**
 * @title Naughty Price Initial Liquidity Matching
 * @notice Naughty Price timeline: 1 -- 14 -- 5
 *         The first day of each round would be the time for liquidity matching
 *         User
 *           - Select the naughty token
 *           - Provide stablecoins into this contract & Select your price choice
 *           - Change the amountA and amountB of this pair
 *         When reach deadline
 *           - Final price of ILM = Initial price of naughty price pair = amountA/amountB
 */
contract NaughtyPriceILM is OwnableUpgradeable {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constants **************************************** //
    // ---------------------------------------------------------------------------------------- //

    // Scale when calculating fee
    uint256 public constant SCALE = 1e12;

    // Degis entrance fee = 1 / 100 deposit amount
    uint256 public constant FEE_DENOMINATOR = 100;

    // Minimum deposit amount
    uint256 public constant MINIMUM_AMOUNT = 1e6;

    // Uint256 maximum value
    uint256 public constant MAX_UINT256 = type(uint256).max;

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Variables **************************************** //
    // ---------------------------------------------------------------------------------------- //

    // Degis token address
    address public degis;

    // PolicyCore, Router and EmergencyPool contract address
    address public policyCore;
    address public router;
    address public emergencyPool;

    struct UserInfo {
        uint256 amountA;
        uint256 amountB;
        uint256 degisDebt;
    }
    // user address => policy token address => user info
    mapping(address => mapping(address => UserInfo)) public users;

    // Status of an ILM round
    enum Status {
        BeforeStart,
        Active,
        Finished,
        Stopped
    }

    struct PairInfo {
        Status status; // 0: before start 1: active 2: finished 3: stopped
        address lptoken; // lptoken address
        uint256 ILMDeadline; // deadline for initial liquidity matching
        address stablecoin; // stablecoin address
        uint256 amountA; // Amount of policy tokens
        uint256 amountB; // Amount of stablecoins
        address naughtyPairAddress; // Naughty pair address deployed when finished ILM
        // degis paid as fee
        uint256 degisAmount;
        uint256 accDegisPerShare;
    }
    // Policy Token Address => Pair Info
    mapping(address => PairInfo) public pairs;

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Events ***************************************** //
    // ---------------------------------------------------------------------------------------- //

    event Deposit(
        address indexed policyToken,
        address indexed stablecoin,
        uint256 amountA,
        uint256 amountB
    );
    event Withdraw(
        address indexed policyToken,
        address indexed stablecoin,
        address indexed user,
        uint256 amountA,
        uint256 amountB
    );
    event EmergencyWithdraw(address owner, uint256 amount);
    event ILMFinish(
        address policyToken,
        address stablecoin,
        address poolAddress,
        uint256 amountA,
        uint256 amountB
    );
    event ILMStart(
        address policyToken,
        address stablecoin,
        uint256 deadline,
        address lptokenAddress
    );
    event Harvest(address user, uint256 reward);
    event Claim(address user, uint256 amountA, uint256 amountB);

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Errors ***************************************** //
    // ---------------------------------------------------------------------------------------- //

    error ILM__WrongILMDeadline();
    error ILM__ZeroAddress();
    error ILM__RoundOver();
    error ILM__PairNotActive();
    error ILM__RoundNotOver();
    error ILM__ZeroAmount();
    error ILM__NotActiveILM();
    error ILM__StablecoinNotPaired();
    error ILM__StablecoinNotSupport();
    error ILM__NoDeposit();
    error ILM__NotEnoughDeposit();

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Initialze function for proxy
     * @dev Called only when deploying proxy contract
     * @param _degis Degis token address
     * @param _policyCore PolicyCore contract address
     * @param _router NaughtyRouter contract address
     * @param _emergencyPool EmergencyPool contract address
     */
    function initialize(
        address _degis,
        address _policyCore,
        address _router,
        address _emergencyPool
    ) public initializer {
        if (_policyCore == address(0) || _router == address(0))
            revert ILM__ZeroAddress();

        __Ownable_init();

        degis = _degis;
        policyCore = _policyCore;
        router = _router;

        emergencyPool = _emergencyPool;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************** Modifiers *************************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Check whether a pair is active
     * @param _policyToken Policy token address
     */
    modifier activePair(address _policyToken) {
        if (pairs[_policyToken].status != Status.Active)
            revert ILM__PairNotActive();
        _;
    }

    /**
     * @notice Check whether is during ILM
     * @param _policyToken Policy token address
     */
    modifier duringILM(address _policyToken) {
        if (block.timestamp > pairs[_policyToken].ILMDeadline)
            revert ILM__RoundOver();
        _;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ View Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Get the current price
     * @dev Price has a scale of 1e12
     * @param _policyToken Policy token address
     * @return price Price of the token pair
     */
    function getPrice(address _policyToken) external view returns (uint256) {
        uint256 amountA = pairs[_policyToken].amountA;
        uint256 amountB = pairs[_policyToken].amountB;
        return (amountA * SCALE) / amountB;
    }

    /**
     * @notice Get the total amount of a pair
     * @param _policyToken Policy token address
     * @return totalAmount Total amount of a pair
     */
    function getPairTotalAmount(address _policyToken)
        external
        view
        returns (uint256 totalAmount)
    {
        totalAmount = pairs[_policyToken].amountA + pairs[_policyToken].amountB;
    }

    /**
     * @notice Get the amount of user's deposit
     * @param _user User address
     * @param _policyToken Policy token address
     */
    function getUserDeposit(address _user, address _policyToken)
        external
        view
        returns (uint256 amountA, uint256 amountB)
    {
        amountA = users[_user][_policyToken].amountA;
        amountB = users[_user][_policyToken].amountB;
    }

    /**
     * @notice Emergency stop ILM
     * @param _policyToken Policy token address to be stopped
     */
    function emergencyStop(address _policyToken) external onlyOwner {
        pairs[_policyToken].status = Status.Stopped;
    }

    /**
     * @notice Emergency restart ILM
     * @param _policyToken Policy token address to be restarted
     */
    function emergencyRestart(address _policyToken) external onlyOwner {
        pairs[_policyToken].status = Status.Active;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Start a new ILM round
     * @dev A new lp token will be deployed when starting a new ILM round
     *      It will have a special farming reward pool
     * @param _policyToken Policy token address
     * @param _stablecoin Stablecoin address
     * @param _ILMDeadline Deadline of ILM period
     */
    function startILM(
        address _policyToken,
        address _stablecoin,
        uint256 _ILMDeadline
    ) external onlyOwner {
        // Get policy token name & Check if this policy token exists
        // The check is inside policy core contract
        string memory policyTokenName = IPolicyCore(policyCore)
            .findNamebyAddress(_policyToken);

        // Check if the stablecoin is supported
        bool isSupported = IPolicyCore(policyCore).supportedStablecoin(
            _stablecoin
        );
        if (!isSupported) revert ILM__StablecoinNotSupport();

        // The deadline for ILM can not be later than the policy token deadline
        uint256 policyTokenDeadline = (
            IPolicyCore(policyCore).getPolicyTokenInfo(policyTokenName)
        ).deadline;
        if (_ILMDeadline >= policyTokenDeadline) revert ILM__WrongILMDeadline();

        PairInfo storage pair = pairs[_policyToken];
        // Update the status
        pair.status = Status.Active;
        pair.stablecoin = _stablecoin;
        pair.ILMDeadline = _ILMDeadline;

        // Deploy a new ERC20 LP Token
        string memory LPTokenName = string(
            abi.encodePacked("ILM-", policyTokenName)
        );
        address lpTokenAddress = _deployLPToken(LPTokenName);

        // Record the lptoken address
        pair.lptoken = lpTokenAddress;

        // Pre-approve the stablecoin for later deposit
        IERC20(_policyToken).approve(router, MAX_UINT256);

        emit ILMStart(_policyToken, _stablecoin, _ILMDeadline, lpTokenAddress);
    }

    /**
     * @notice Finish a round of ILM
     * @dev The swap pool for the protection token will be deployed with inital liquidity\
     *      The amount of initial liquidity will be the total amount of the pair
     *      Can be called by any address
     * @param _policyToken Policy token address
     * @param _deadlineForSwap Pool deadline
     * @param _feeRate Fee rate of the swap pool
     */
    function finishILM(
        address _policyToken,
        uint256 _deadlineForSwap,
        uint256 _feeRate
    ) external activePair(_policyToken) {
        PairInfo memory pair = pairs[_policyToken];

        // Pair status is 1 and passed deadline => can finish ILM
        if (block.timestamp <= pair.ILMDeadline) revert ILM__RoundNotOver();
        if (pair.amountA + pair.amountB == 0) revert ILM__NoDeposit();

        // Update the status of this pair
        pairs[_policyToken].status = Status.Finished;

        // Get policy token name
        string memory policyTokenName = IPolicyCore(policyCore)
            .findNamebyAddress(_policyToken);

        // Deploy a new pool and return the pool address
        address poolAddress = IPolicyCore(policyCore).deployPool(
            policyTokenName,
            pair.stablecoin,
            _deadlineForSwap,
            _feeRate // maximum = 1000 = 100%
        );
        pairs[_policyToken].naughtyPairAddress = poolAddress;

        // Approval prepration for withdraw liquidity
        INaughtyPair(poolAddress).approve(router, MAX_UINT256);

        // Add initial liquidity to the pool
        // Zero slippage
        INaughtyRouter(router).addLiquidityWithUSD(
            _policyToken,
            pair.stablecoin,
            pair.amountA,
            pair.amountB,
            pair.amountA,
            pair.amountB,
            address(this),
            block.timestamp + 60
        );

        emit ILMFinish(
            _policyToken,
            pair.stablecoin,
            poolAddress,
            pair.amountA,
            pair.amountB
        );
    }

    /**
     * @notice Deposit stablecoin and choose the price
     * @dev Deposit only check the pair status not the deadline
     *      There may be a zero ILM and we still need to deposit some asset to make it start
     *      Anyone wants to enter ILM need to pay some DEG as entrance fee
     *      The ratio is 100:1(usd:deg) and your fee is distributed to the users prior to you
     * @param _policyToken Policy token address
     * @param _stablecoin Stablecoin address
     * @param _amountA Amount of policy token (virtual)
     * @param _amountB Amount of stablecoin (virtual)
     */
    function deposit(
        address _policyToken,
        address _stablecoin,
        uint256 _amountA,
        uint256 _amountB
    ) external activePair(_policyToken) {
        if (_amountA + _amountB < MINIMUM_AMOUNT) revert ILM__ZeroAmount();
        if (_stablecoin != pairs[_policyToken].stablecoin)
            revert ILM__StablecoinNotPaired();

        uint256 amountToDeposit = _amountA + _amountB;

        // Every 100usd pay 1 degis
        uint256 decimalDiff = 18 - IERC20Decimals(_stablecoin).decimals();
        uint256 degisToPay = (amountToDeposit * 10**decimalDiff) /
            FEE_DENOMINATOR;

        // Update the info about deg entrance fee when deposit
        _updateWhenDeposit(
            _policyToken,
            amountToDeposit,
            degisToPay,
            decimalDiff
        );

        PairInfo storage pair = pairs[_policyToken];
        UserInfo storage user = users[msg.sender][_policyToken];

        // Update deg record and transfer degis token
        pair.degisAmount += degisToPay;
        IERC20(degis).safeTransferFrom(msg.sender, address(this), degisToPay);

        // Update the status
        pair.amountA += _amountA;
        pair.amountB += _amountB;
        user.amountA += _amountA;
        user.amountB += _amountB;

        // Transfer tokens
        IERC20(_stablecoin).safeTransferFrom(
            msg.sender,
            address(this),
            amountToDeposit
        );

        // Distribute the lptoken
        address lpToken = pairs[_policyToken].lptoken;
        LPToken(lpToken).mint(msg.sender, amountToDeposit);

        emit Deposit(_policyToken, _stablecoin, _amountA, _amountB);
    }

    /**
     * @notice Withdraw stablecoins
     * @dev Only checks the status not the deadline
     * @param _policyToken Policy token address
     * @param _stablecoin Stablecoin address
     * @param _amountA Amount of policy token (virtual)
     * @param _amountB Amount of stablecoin (virtual)
     */
    function withdraw(
        address _policyToken,
        address _stablecoin,
        uint256 _amountA,
        uint256 _amountB
    ) public activePair(_policyToken) {
        UserInfo memory currentUserInfo = users[msg.sender][_policyToken];

        // Check if the user has enough tokens to withdraw
        if (currentUserInfo.amountA + currentUserInfo.amountB == 0)
            revert ILM__NoDeposit();
        if (
            _amountA > currentUserInfo.amountA ||
            _amountB > currentUserInfo.amountB
        ) revert ILM__NotEnoughDeposit();

        PairInfo storage pair = pairs[_policyToken];
        UserInfo storage user = users[msg.sender][_policyToken];

        // Update status when withdraw
        uint256 degisToWithdraw = (pair.accDegisPerShare *
            (currentUserInfo.amountA + currentUserInfo.amountB)) /
            SCALE -
            currentUserInfo.degisDebt;

        if (degisToWithdraw > 0) {
            // Degis will be withdrawed to emergency pool, not the user
            uint256 reward = _safeTokenTransfer(
                degis,
                emergencyPool,
                degisToWithdraw
            );
            emit Harvest(emergencyPool, reward);
        }

        // Update the user's amount and pool's amount
        pair.amountA -= _amountA;
        pair.amountB -= _amountB;
        user.amountA -= _amountA;
        user.amountB -= _amountB;

        uint256 amountToWithdraw = _amountA + _amountB;

        // Withdraw stablecoins to the user
        _safeTokenTransfer(_stablecoin, msg.sender, amountToWithdraw);

        // Burn the lptokens
        LPToken(pair.lptoken).burn(msg.sender, amountToWithdraw);

        // Update the user debt
        user.degisDebt =
            ((user.amountA + user.amountB) * pair.accDegisPerShare) /
            SCALE;

        emit Withdraw(
            _policyToken,
            _stablecoin,
            msg.sender,
            _amountA,
            _amountB
        );
    }

    /**
     * @notice Withdraw all stablecoins of a certain policy token
     * @param _policyToken Policy token address
     * @param _stablecoin Stablecoin address
     */
    function withdrawAll(address _policyToken, address _stablecoin) external {
        uint256 amounAMax = users[msg.sender][_policyToken].amountA;
        uint256 amounBMax = users[msg.sender][_policyToken].amountB;

        withdraw(_policyToken, _stablecoin, amounAMax, amounBMax);
    }

    /**
     * @notice Claim liquidity back
     * @dev You will get back some DEG (depending on how many users deposit after you)
     *      The claim amount is determined by the LP Token balance of you (you can buy from others)
     *      But the DEG reward would only be got once
     *      Your LP token will be burnt and you can not join ILM farming pool again
     * @param _policyToken Policy token address
     * @param _stablecoin Stablecoin address
     * @param _amountAMin Minimum amount of policy token (slippage)
     * @param _amountBMin Minimum amount of stablecoin (slippage)
     */
    function claim(
        address _policyToken,
        address _stablecoin,
        uint256 _amount,
        uint256 _amountAMin,
        uint256 _amountBMin
    ) external {
        if (_amount == 0) revert ILM__ZeroAmount();

        address naughtyPair = pairs[_policyToken].naughtyPairAddress;
        address lptoken = pairs[_policyToken].lptoken;

        uint256 lpBalance = LPToken(lptoken).balanceOf(msg.sender);
        uint256 lpToClaim = _amount > lpBalance ? lpBalance : _amount;

        // Total liquidity owned by the pool
        uint256 totalLiquidity = INaughtyPair(naughtyPair).balanceOf(
            address(this)
        );

        // User's liquidity amount
        uint256 userLiquidity = (lpToClaim * totalLiquidity) /
            LPToken(lptoken).totalSupply();

        _updateWhenClaim(_policyToken);

        // Remove liquidity
        (uint256 policyTokenAmount, uint256 stablecoinAmount) = INaughtyRouter(
            router
        ).removeLiquidity(
                _policyToken,
                _stablecoin,
                userLiquidity,
                _amountAMin,
                _amountBMin,
                msg.sender,
                block.timestamp + 60
            );

        // Update user quota
        IPolicyCore(policyCore).updateUserQuota(
            msg.sender,
            _policyToken,
            policyTokenAmount
        );

        // Burn the user's lp tokens
        LPToken(lptoken).burn(msg.sender, lpToClaim);

        emit Claim(msg.sender, policyTokenAmount, stablecoinAmount);
    }

    /**
     * @notice Emergency withdraw a certain token
     * @param _token Token address
     * @param _amount Token amount
     */
    function emergencyWithdraw(address _token, uint256 _amount) external {
        IERC20(_token).safeTransfer(owner(), _amount);

        emit EmergencyWithdraw(owner(), _amount);
    }

    /**
     * @notice Approve stablecoins for naughty price contracts
     * @param _stablecoin Stablecoin address
     */
    function approveStablecoin(address _stablecoin) external {
        IERC20(_stablecoin).approve(router, MAX_UINT256);
        IERC20(_stablecoin).approve(policyCore, MAX_UINT256);
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Internal Functions ********************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Deploy the new lp token for a round
     * @param _name Name of the lp token
     * @return lpTokenAddress Address of the lp token
     */
    function _deployLPToken(string memory _name) internal returns (address) {
        address lpTokenAddress = address(
            new LPToken(address(this), _name, _name)
        );
        return lpTokenAddress;
    }

    /**
     * @notice Safely transfer tokens
     * @param _token Token address
     * @param _receiver Receiver address
     * @param _amount Amount of tokens
     * @return realAmount Real amount that is transferred
     */
    function _safeTokenTransfer(
        address _token,
        address _receiver,
        uint256 _amount
    ) internal returns (uint256) {
        uint256 balance = IERC20(_token).balanceOf(address(this));

        if (_amount > balance) {
            IERC20(_token).safeTransfer(_receiver, balance);
            return balance;
        } else {
            IERC20(_token).safeTransfer(_receiver, _amount);
            return _amount;
        }
    }

    /**
     * @notice Update debt & fee distribution
     * @param _policyToken Policy token address
     * @param _usdAmount Amount of stablecoins input
     * @param _degAmount Amount of degis input
     */
    function _updateWhenDeposit(
        address _policyToken,
        uint256 _usdAmount,
        uint256 _degAmount,
        uint256 _decimalDiff
    ) internal {
        PairInfo storage pair = pairs[_policyToken];

        // If this is the first user, accDegisPerShare = 1e16
        // No debt
        if (pair.degisAmount == 0) {
            pair.accDegisPerShare =
                (SCALE * 10**_decimalDiff) /
                FEE_DENOMINATOR;
            return;
        }

        UserInfo storage user = users[msg.sender][_policyToken];

        // Update accDegisPerShare first
        pair.accDegisPerShare +=
            (_degAmount * SCALE) /
            ((pair.amountA + pair.amountB));

        uint256 currentUserDeposit = user.amountA + user.amountB;
        // If user has deposited before, distribute the deg reward first
        // Pending reward is calculated with the new degisPerShare value
        if (currentUserDeposit > 0) {
            uint256 pendingReward = (currentUserDeposit *
                pair.accDegisPerShare) /
                SCALE -
                user.degisDebt;

            uint256 reward = _safeTokenTransfer(
                degis,
                msg.sender,
                pendingReward
            );
            emit Harvest(msg.sender, reward);
        }

        // Update user debt
        user.degisDebt =
            (pair.accDegisPerShare * (currentUserDeposit + _usdAmount)) /
            SCALE;
    }

    /**
     * @notice Update degis reward when claim
     * @param _policyToken Policy token address
     */
    function _updateWhenClaim(address _policyToken) internal {
        uint256 accDegisPerShare = pairs[_policyToken].accDegisPerShare;

        UserInfo storage user = users[msg.sender][_policyToken];

        uint256 userTotalDeposit = user.amountA + user.amountB;

        uint256 pendingReward = (userTotalDeposit * accDegisPerShare) /
            SCALE -
            user.degisDebt;

        if (pendingReward > 0) {
            // Update debt
            // Only get deg back when first time claim
            user.degisDebt = (userTotalDeposit * accDegisPerShare) / SCALE;

            uint256 reward = _safeTokenTransfer(
                degis,
                msg.sender,
                pendingReward
            );
            emit Harvest(msg.sender, reward);
        }
    }
}
