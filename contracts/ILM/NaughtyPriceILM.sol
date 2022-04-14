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

    uint256 public constant SCALE = 1e18;
    uint256 public constant fee = 1;

    address public degis;

    address public policyCore;
    address public naughtyRouter;

    struct UserInfo {
        uint256 amountA;
        uint256 amountB;
        uint256 degisDebt;
    }
    mapping(address => mapping(address => UserInfo)) public users;

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
        uint256 accDegisPerShare;
    }
    // Policy Token Address => Pair Info
    mapping(address => PairInfo) public pairs;

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

    function initialize(
        address _degis,
        address _policyCore,
        address _router
    ) public initializer {
        if (_policyCore == address(0) || _router == address(0))
            revert ILM__ZeroAddress();

        __Ownable_init();

        degis = _degis;
        policyCore = _policyCore;
        naughtyRouter = _router;
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
     * @notice Get the price
     * @param _policyToken Policy token address
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
        returns (uint256)
    {
        return pairs[_policyToken].amountA + pairs[_policyToken].amountB;
    }

    /**
     * @notice Get the amount of user's deposit
     * @param _user User address
     * @param _policyToken Policy token address
     */
    function getUserDeposit(address _user, address _policyToken)
        public
        view
        returns (uint256 amountA, uint256 amountB)
    {
        amountA = users[_user][_policyToken].amountA;
        amountB = users[_user][_policyToken].amountB;
    }

    function emergencyStop(address _policyToken) external onlyOwner {
        pairs[_policyToken].status = Status.Stopped;
    }

    function emergencyRestart(address _policyToken) external onlyOwner {
        pairs[_policyToken].status = Status.Active;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Start a new ILM round
     * @param _policyToken Policy token address
     * @param _stablecoin Stablecoin address
     * @param _ILMDeadline Deadline of ILM period
     */
    function startILM(
        address _policyToken,
        address _stablecoin,
        uint256 _ILMDeadline
    ) external onlyOwner {
        // Check if this policy token exists
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

        // Update the status
        pairs[_policyToken].status = Status.Active;
        pairs[_policyToken].stablecoin = _stablecoin;
        pairs[_policyToken].ILMDeadline = _ILMDeadline;

        // Deploy a new ERC20 LP Token
        string memory LPTokenName = string(
            abi.encodePacked("ILM-", policyTokenName)
        );
        address lpTokenAddress = _deployLPToken(LPTokenName);

        // Record the lptoken address
        pairs[_policyToken].lptoken = lpTokenAddress;

        // Pre-approve the stablecoin for later deposit
        IERC20(_stablecoin).approve(naughtyRouter, type(uint256).max);
        IERC20(_stablecoin).approve(policyCore, type(uint256).max);
        IERC20(_policyToken).approve(naughtyRouter, type(uint256).max);

        emit ILMStart(_policyToken, _stablecoin, _ILMDeadline, lpTokenAddress);
    }

    /**
     * @notice Finish a round of ILM and deploy the swap pool
     * @param _policyToken Policy token address
     * @param _deadlineForSwap Pool deadline
     */
    function finishILM(address _policyToken, uint256 _deadlineForSwap)
        external
        activePair(_policyToken)
    {
        PairInfo memory pair = pairs[_policyToken];

        // Pair status is 1 and passed deadline => can finish ILM
        if (block.timestamp <= pair.ILMDeadline) revert ILM__RoundNotOver();
        if (pair.amountA + pair.amountB == 0) revert ILM__NoDeposit();

        pairs[_policyToken].status = Status.Finished;

        string memory policyTokenName = IPolicyCore(policyCore)
            .findNamebyAddress(_policyToken);

        address poolAddress = IPolicyCore(policyCore).deployPool(
            policyTokenName,
            pair.stablecoin,
            _deadlineForSwap,
            50 // 5%
        );
        pairs[_policyToken].naughtyPairAddress = poolAddress;

        // Approval prepration for withdraw liquidity
        INaughtyPair(poolAddress).approve(naughtyRouter, type(uint256).max);

        INaughtyRouter(naughtyRouter).addLiquidityWithUSD(
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
        if (_amountA == 0 || _amountB == 0) revert ILM__ZeroAmount();
        if (_stablecoin != pairs[_policyToken].stablecoin)
            revert ILM__StablecoinNotPaired();

        // Every 100usd pay 1 degis
        uint256 decimalDiff = 18 - IERC20Decimals(_stablecoin).decimals();
        uint256 degisToPay = ((_amountA + _amountB) * 10**decimalDiff) / 100;
        _updateDebt(_policyToken, degisToPay);
        IERC20(degis).safeTransferFrom(msg.sender, address(this), degisToPay);

        _updateUserAmount(msg.sender, _policyToken, _amountA, _amountB, true);
        _updateAmount(_policyToken, _amountA, _amountB, true);

        // Transfer tokens
        IERC20(_stablecoin).safeTransferFrom(
            msg.sender,
            address(this),
            _amountA + _amountB
        );

        // Distribute the lptoken
        address lpToken = pairs[_policyToken].lptoken;
        LPToken(lpToken).mint(msg.sender, _amountA + _amountB);

        emit Deposit(_policyToken, _stablecoin, _amountA, _amountB);
    }

    function _updateDebt(address _policyToken, uint256 _amount) internal {
        if (IERC20(degis).balanceOf(address(this)) == 0) return;

        uint256 feeToPay = (_amount * fee) / 100;

        pairs[_policyToken].accDegisPerShare +=
            (feeToPay * SCALE) /
            IERC20(degis).balanceOf(address(this));

        UserInfo storage user = users[msg.sender][_policyToken];

        // Update the debt
        user.degisDebt =
            pairs[_policyToken].accDegisPerShare *
            (user.amountA + user.amountB);
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
        uint256 userDeposit = users[msg.sender][_policyToken].amountA +
            users[msg.sender][_policyToken].amountB;

        // Check if the user has enough tokens to withdraw
        if (userDeposit == 0) revert ILM__NoDeposit();
        if (_amountA + _amountB > userDeposit) revert ILM__NotEnoughDeposit();

        // Update the user's amount and pool's amount
        _updateUserAmount(msg.sender, _policyToken, _amountA, _amountB, false);
        _updateAmount(_policyToken, _amountA, _amountB, false);

        // Transfer stablecoins back to user
        _safeTokenTransfer(_stablecoin, msg.sender, _amountA + _amountB);

        // Burn the lptokens
        address lpToken = pairs[_policyToken].lptoken;
        LPToken(lpToken).burn(msg.sender, _amountA + _amountB);

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
     * @param _policyToken Policy token address
     * @param _stablecoin Stablecoin address
     * @param _amountAMin Minimum amount of policy token (slippage)
     * @param _amountBMin Minimum amount of stablecoin (slippage)
     */
    function claim(
        address _policyToken,
        address _stablecoin,
        uint256 _amountAMin,
        uint256 _amountBMin
    ) external {
        UserInfo memory user = users[msg.sender][_policyToken];

        if (user.amountA + user.amountB == 0) revert ILM__NotEnoughDeposit();

        PairInfo memory pair = pairs[_policyToken];

        uint256 totalLiquidity = INaughtyPair(pair.naughtyPairAddress)
            .balanceOf(address(this));
        // uint256 userLiquidity = (user.totalDeposit * totalLiquidity) /
        //     (pair.amountA + pair.amountB);

        uint256 userLiquidity = (LPToken(pair.lptoken).balanceOf(msg.sender) *
            totalLiquidity) / LPToken(pair.lptoken).totalSupply();

        (uint256 amountA, uint256 amountB) = INaughtyRouter(naughtyRouter)
            .removeLiquidity(
                _policyToken,
                _stablecoin,
                userLiquidity,
                _amountAMin,
                _amountBMin,
                msg.sender,
                block.timestamp + 60
            );

        delete users[msg.sender][_policyToken];

        // Burn the user's lp tokens
        LPToken(pair.lptoken).burn(
            msg.sender,
            LPToken(pair.lptoken).balanceOf(msg.sender)
        );

        _updateAmount(_policyToken, amountA, amountB, false);
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
     * @notice Update the user amount of both sides
     */
    function _updateUserAmount(
        address _user,
        address _policyToken,
        uint256 _amountA,
        uint256 _amountB,
        bool _isDeposit
    ) internal {
        if (_isDeposit) {
            users[_user][_policyToken].amountA += _amountA;
            users[_user][_policyToken].amountB += _amountB;
        } else {
            users[_user][_policyToken].amountA -= _amountA;
            users[_user][_policyToken].amountB -= _amountB;
        }
    }

    /**
     * @notice Update the pool's amount
     * @param _policyToken Policy token address
     * @param _amountA Amount of policy token (virtual)
     * @param _amountB Amount of stablecoin (virtual)
     */
    function _updateAmount(
        address _policyToken,
        uint256 _amountA,
        uint256 _amountB,
        bool _isDeposit
    ) internal {
        if (_isDeposit) {
            pairs[_policyToken].amountA += _amountA;
            pairs[_policyToken].amountB += _amountB;
        } else {
            pairs[_policyToken].amountA -= _amountA;
            pairs[_policyToken].amountB -= _amountB;
        }
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
}
