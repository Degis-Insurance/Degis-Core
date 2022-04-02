// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IPolicyCore} from "../naughty-price/interfaces/IPolicyCore.sol";
import {INaughtyRouter} from "../naughty-price/interfaces/INaughtyRouter.sol";
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

    uint256 public SCALE = 1e18;

    address public shield;

    address public policyCore;
    address public naughtyRouter;

    struct UserInfo {
        uint256 totalDeposit;
        uint256 amountA;
        uint256 amountB;
    }
    mapping(address => mapping(address => UserInfo)) users;

    struct PairInfo {
        address lptoken; // lptoken address
        uint256 deadline;
        address stablecoin;
        uint256 status; // 0: not start 1:active 2:finished
        uint256 amountA; // Amount of policy tokens
        uint256 amountB; // Amount of stablecoins
    }
    // Policy Token Address => Pair Info
    mapping(address => PairInfo) pairs;

    event Deposit(address policyToken, uint256 amountA, uint256 amountB);

    event EmergencyWithdraw(address owner, uint256 amount);

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //

    function initialize(address _policyCore) public initializer {
        require(_policyCore != address(0), "Zero address");
        __Ownable_init();

        policyCore = _policyCore;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ View Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    modifier duringILM(address _policyToken) {
        require(block.timestamp <= pairs[_policyToken].deadline, "ILM over");
        _;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ View Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //
    function getPrice(address _policyTokenAddress)
        public
        view
        returns (uint256)
    {
        uint256 amountA = pairs[_policyTokenAddress].amountA;
        uint256 amountB = pairs[_policyTokenAddress].amountB;
        return (amountA * SCALE) / amountB;
    }

    function getUserDeposit(address _user, address _policyToken)
        public
        view
        returns (uint256 amountA, uint256 amountB)
    {
        amountA = users[_user][_policyToken].amountA;
        amountB = users[_user][_policyToken].amountB;
    }

    error ZeroAmount();
    error NotActiveILM();
    error WrongStablecoin();
    error StablecoinNotSupport();

    /**
     * @notice Start a new ILM round
     */
    function startILM(
        address _policyToken,
        address _stablecoin,
        uint256 _time
    ) external onlyOwner {
        // Check if this policy token exists
        string memory policyTokenName = IPolicyCore(policyCore)
            .findNamebyAddress(_policyToken);

        // Check if the stablecoin is supported
        bool isSupported = IPolicyCore(policyCore).supportedStablecoin(
            _stablecoin
        );
        if (!isSupported) revert StablecoinNotSupport();

        // Update the status
        pairs[_policyToken].status = 1;
        pairs[_policyToken].stablecoin = _stablecoin;
        pairs[_policyToken].deadline = block.timestamp + _time;

        // Deploy a new ERC20 LP Token
        string memory LPTokenName = string(
            abi.encodePacked("ILM-", policyTokenName)
        );
        address _lpTokenAddress = _deployLPToken(LPTokenName);

        // Record the lptoken address
        pairs[_policyToken].lptoken = _lpTokenAddress;
    }

    function _deployLPToken(string memory _name) internal returns (address) {
        address lpTokenAddress = address(
            new LPToken(address(this), _name, _name)
        );
        return lpTokenAddress;
    }

    function finishILM(address _policyToken) external activePair(_policyToken) {
        // Pair status is 1 and passed deadline => can finish ILM
        require(
            block.timestamp > pairs[_policyToken].deadline,
            "Still before deadline"
        );

        pairs[_policyToken].status = 2;

        PairInfo memory pair = pairs[_policyToken];

        string memory policyTokenName = IPolicyCore(policyCore)
            .findNamebyAddress(_policyToken);

        address poolAddress = IPolicyCore(policyCore).deployPool(
            policyTokenName,
            pair.stablecoin,
            pair.deadline,
            50 // 5%
        );

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
    }

    function startNaughtyPriceRound() public {}

    modifier activePair(address _policyToken) {
        require(pairs[_policyToken].status == 1, "Not active pair");
        _;
    }

    function deposit(
        address _policyToken,
        address _stablecoin,
        uint256 _amountA,
        uint256 _amountB
    ) public activePair(_policyToken) {
        if (_amountA == 0 || _amountB == 0) revert ZeroAmount();
        if (_stablecoin != pairs[_policyToken].stablecoin)
            revert WrongStablecoin();

        // Transfer tokens
        IERC20(_stablecoin).safeTransferFrom(
            msg.sender,
            address(this),
            _amountA + _amountB
        );

        _updateUserAmount(msg.sender, _policyToken, _amountA, _amountB, true);
        _updateAmount(_policyToken, _amountA, _amountB);

        // Distribute the lptoken
        address lpToken = pairs[_policyToken].lptoken;
        LPToken(lpToken).mint(msg.sender, _amountA + _amountB);

        emit Deposit(_policyToken, _amountA, _amountB);
    }

    function withdraw(
        address _policyToken,
        address _stablecoin,
        uint256 _amountA,
        uint256 _amountB
    ) public duringILM(_policyToken) {
        require(
            _amountA + _amountB <= users[msg.sender][_policyToken].totalDeposit,
            "Not enough deposit"
        );

        _updateUserAmount(msg.sender, _policyToken, _amountA, _amountB, false);
        _updateAmount(_policyToken, _amountA, _amountB);

        _safeTokenTransfer(_stablecoin, msg.sender, _amountA + _amountB);

        // Burn the lptoken
        address lpToken = pairs[_policyToken].lptoken;
        LPToken(lpToken).burn(msg.sender, _amountA + _amountB);
    }

    /**
     * @notice Withdraw all stablecoins of a certain policy token
     */
    function withdrawAll(address _policyToken, address _stablecoin) public {
        UserInfo memory user = users[msg.sender][_policyToken];
        require(user.totalDeposit > 0, "No deposit");

        withdraw(_policyToken, _stablecoin, user.amountA, user.amountB);
    }

    function claim(
        address _policyToken,
        address _stablecoin,
        uint256 _amountA,
        uint256 _amountB
    ) public {}

    function emergencyWithdraw(address _token, uint256 _amount) public {
        IERC20(_token).safeTransfer(owner(), _amount);

        emit EmergencyWithdraw(owner(), _amount);
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Internal Functions ********************************* //
    // ---------------------------------------------------------------------------------------- //

    function _updateUserAmount(
        address _user,
        address _policyToken,
        uint256 _amountA,
        uint256 _amountB,
        bool _isDeposit
    ) internal {
        if (_isDeposit) {
            users[_user][_policyToken].totalDeposit += _amountA + _amountB;
            users[_user][_policyToken].amountA += _amountA;
            users[_user][_policyToken].amountB += _amountB;
        } else {
            users[_user][_policyToken].totalDeposit -= _amountA + _amountB;
            users[_user][_policyToken].amountA -= _amountA;
            users[_user][_policyToken].amountB -= _amountB;
        }
    }

    // 需要update 因为用户只质押了usd 无法通过balanceOf查询两方分布
    function _updateAmount(
        address _policyToken,
        uint256 _amountA,
        uint256 _amountB
    ) internal {
        pairs[_policyToken].amountA += _amountA;
        pairs[_policyToken].amountB += _amountB;
    }

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
