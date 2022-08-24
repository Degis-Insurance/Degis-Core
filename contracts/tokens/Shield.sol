// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

import { ERC20Upgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import { ICurvePool } from "./interfaces/ICurvePool.sol";
import { IPlatypusPool } from "./interfaces/IPlatypusPool.sol";

/**
 * @title  Shield Token (Derived Stablecoin on Degis)
 * @author Eric Lee (ylikp.ust@gmail.com)
 * @dev    Users can swap other stablecoins to Shield (actually backed by USDC only)
 *         Shield can be used in NaughtyPrice and future products
 *
 *         When users want to withdraw, their shield tokens will be burned
 *         and USDC will be sent back to them (if no sepecific choice)
 *             other stablecoins will be sent back to them (if have sepecific choice)
 *
 *         Currently, the swap is done inside Platypus & Curve
 *
 *         The stablecoin and its swapping pool should be supported
 *
 *         When deposit, the toToken is USDC, which pool to use depends on tokenToPoolForDeposit(token)
 *         When withdraw, the fromToken is USDC, which pool to use depends on tokenToPoolForWithdraw(token)
 */
contract Shield is ERC20Upgradeable, OwnableUpgradeable {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constants **************************************** //
    // ---------------------------------------------------------------------------------------- //

    // USDC address (base token)
    address public constant USDC = 0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E;

    // Other stablecoin addresses
    address public constant USDCe = 0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664;
    address public constant USDT = 0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7;
    address public constant USDTe = 0xc7198437980c041c805A1EDcbA50c1Ce5db95118;
    address public constant DAIe = 0xd586E7F844cEa2F87f50152665BCbc2C279D8d70;
    address public constant YUSD = 0x111111111111ed1D73f860F57b2798b683f2d325;

    uint256 public constant PLATYPUS_SWAP = 1;
    uint256 public constant CURVE_SWAP = 2;

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Variables **************************************** //
    // ---------------------------------------------------------------------------------------- //

    // PTP Main Pool: USDC + USDT + USDC.e + USDT.e + DAI.e
    address public constant PTP_MAIN =
        0x66357dCaCe80431aee0A7507e2E361B7e2402370;

    // Curve YUSD pool: YUSD + USDT + USDC
    address public constant CURVE_YUSD =
        0x1da20Ac34187b2d9c74F729B85acB225D3341b25;

    // Stablecoin => whether supported
    mapping(address => bool) public supportedStablecoin;

    // All supporting swap pools
    mapping(string => address) public pools;

    // User staked USDC balance
    mapping(address => uint256) public userBalance;

    // Token address => swap pool address
    // If fromToken is x, then use mapping(x) to swap
    mapping(address => address) public tokenToPoolForDeposit;
    // If toToken is x, then use mapping(x) to swap
    mapping(address => address) public tokenToPoolForWithdraw;

    // Curve pool address => Token address => Token index
    mapping(address => mapping(address => int128)) public curvePoolTokenIndex;

    // ------------------------------------------------------------------------- --------------- //
    // *************************************** Events ***************************************** //
    // ---------------------------------------------------------------------------------------- //

    event AddStablecoin(address stablecoin);
    event Deposit(
        address indexed user,
        address indexed stablecoin,
        uint256 inAmount,
        uint256 outAmount
    );
    event Withdraw(address indexed user, uint256 amount);

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //

    function initialize() public initializer {
        __ERC20_init("Shield Token", "SHD");
        __Ownable_init();

        // USDT.e
        supportedStablecoin[USDTe] = true;
        // USDT
        supportedStablecoin[USDT] = true;
        // USDC.e
        supportedStablecoin[USDCe] = true;
        // USDC
        supportedStablecoin[USDC] = true;
        // DAI.e
        supportedStablecoin[DAIe] = true;
        // YUSD
        supportedStablecoin[YUSD] = true;

        IERC20(USDC).approve(PTP_MAIN, type(uint256).max);
        IERC20(USDT).approve(PTP_MAIN, type(uint256).max);
        IERC20(USDTe).approve(PTP_MAIN, type(uint256).max);
        IERC20(USDCe).approve(PTP_MAIN, type(uint256).max);
        IERC20(DAIe).approve(PTP_MAIN, type(uint256).max);

        IERC20(YUSD).approve(CURVE_YUSD, type(uint256).max);

        // YUSD pool indexes
        curvePoolTokenIndex[CURVE_YUSD][YUSD] = 0;
        curvePoolTokenIndex[CURVE_YUSD][USDC] = 1;
        curvePoolTokenIndex[CURVE_YUSD][USDT] = 2;

        // Token to pool
        tokenToPoolForDeposit[YUSD] = CURVE_YUSD;
        tokenToPoolForWithdraw[YUSD] = CURVE_YUSD;

        tokenToPoolForDeposit[USDT] = PTP_MAIN;
        tokenToPoolForWithdraw[USDT] = PTP_MAIN;

        tokenToPoolForDeposit[USDTe] = PTP_MAIN;
        tokenToPoolForWithdraw[USDTe] = PTP_MAIN;

        
        tokenToPoolForDeposit[USDCe] = PTP_MAIN;
        tokenToPoolForWithdraw[USDCe] = PTP_MAIN;
        
        tokenToPoolForDeposit[DAIe] = PTP_MAIN;
        tokenToPoolForWithdraw[DAIe] = PTP_MAIN;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Set Functions ************************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Add new supported stablecoin
     *
     * @dev Set a new supported token address
     *      Only callable by the owner
     *
     * @param _stablecoin Stablecoin address
     */
    function addSupportedStablecoin(address _stablecoin) external onlyOwner {
        supportedStablecoin[_stablecoin] = true;

        emit AddStablecoin(_stablecoin);
    }

    /**
     * @notice Add new curve pool
     *
     * @param _pool   Curve pool address
     * @param _tokens Tokens inside this pool
     */
    function addCurvePool(address _pool, address[] calldata _tokens)
        external
        onlyOwner
    {
        uint256 length = _tokens.length;
        for (uint256 i; i < length; ) {
            curvePoolTokenIndex[_pool][_tokens[i]] = int128(int256(i));

            unchecked {
                ++i;
            }
        }
    }

    function setTokenToPool(
        bool _isDeposit,
        address _token,
        address _pool
    ) external onlyOwner {
        if (_isDeposit) {
            tokenToPoolForDeposit[_token] = _pool;
        } else {
            tokenToPoolForWithdraw[_token] = _pool;
        }
    }

    /**
     * @notice Approve a stablecoin for swapping
     *         Call once for each stablecoin
     *
     * @param _token    Stablecoin address
     * @param _contract Contract address to give allowance
     */
    function approveStablecoin(address _token, address _contract) external {
        IERC20(_token).approve(_contract, type(uint256).max);
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Deposit tokens and mint Shield
     *         If the input is USDC, no swap needed, otherwise, swap to USDC
     *
     * @param _type       Swap type (1 for PTP, 2 for Curve)
     * @param _stablecoin Stablecoin address
     * @param _amount     Input stablecoin amount
     * @param _minAmount  Minimum amount output (if need swap)
     */
    function deposit(
        uint256 _type,
        address _stablecoin,
        uint256 _amount,
        uint256 _minAmount
    ) external {
        require(supportedStablecoin[_stablecoin], "Stablecoin not supported");

        // Transfer stablecoin to this contract
        IERC20(_stablecoin).safeTransferFrom(
            msg.sender,
            address(this),
            _amount
        );

        // Actual shield amount
        uint256 outAmount;

        if (_stablecoin != USDC) {
            // Swap stablecoin to USDC and directly goes to this contract
            if (_type == PLATYPUS_SWAP) {
                outAmount = _ptpSwap(
                    tokenToPoolForDeposit[_stablecoin],
                    _stablecoin,
                    USDC,
                    _amount,
                    _minAmount,
                    address(this)
                );
            }
            // Curve YUSD swap
            else if (_type == CURVE_SWAP) {
                outAmount = _curveSwap(
                    tokenToPoolForDeposit[_stablecoin],
                    _stablecoin,
                    USDC,
                    _amount,
                    _minAmount
                );
            } else revert("No swap pair");
        } else {
            outAmount = _amount;
        }

        // Record user balance
        userBalance[msg.sender] += outAmount;

        // Mint shield
        _mint(msg.sender, outAmount);

        emit Deposit(msg.sender, _stablecoin, _amount, outAmount);
    }

    /**
     * @notice Withdraw stablecoins and burn shield
     *
     * @param _type       Swap type (use PTP/Curve, which pool)
     * @param _stablecoin Stablecoin address
     * @param _amount     Amount of shield to burn
     * @param _minAmount  Minimum amount of stablecoin to withdraw (if need swap)
     */
    function withdraw(
        uint256 _type,
        address _stablecoin,
        uint256 _amount,
        uint256 _minAmount
    ) external {
        require(supportedStablecoin[_stablecoin], "Stablecoin not supported");

        require(userBalance[msg.sender] >= _amount, "Insufficient balance");

        uint256 actualAmount;

        if (_stablecoin == USDC) withdraw(_stablecoin, _amount);
        else {
            if (_type == PLATYPUS_SWAP) {
                // Swap USDC to stablecoin and directly
                actualAmount = _ptpSwap(
                    tokenToPoolForWithdraw[_stablecoin],
                    USDC,
                    _stablecoin,
                    _amount,
                    _minAmount,
                    address(this)
                );
            } else if (_type == CURVE_SWAP) {
                actualAmount = _curveSwap(
                    tokenToPoolForWithdraw[_stablecoin],
                    USDC,
                    _stablecoin,
                    _amount,
                    _minAmount
                );
            }

            withdraw(_stablecoin, actualAmount);
        }
    }

    /**
     * @notice Withdraw USDC
     *
     * @param _amount Amount of Shield to be burned
     */
    function withdraw(address _stablecoin, uint256 _amount) public {
        // Transfer USDC back
        uint256 realAmount = _safeTokenTransfer(_stablecoin, _amount);

        userBalance[msg.sender] -= realAmount;

        // Burn shield token
        _burn(msg.sender, realAmount);

        emit Withdraw(msg.sender, realAmount);
    }

    /**
     * @notice Withdraw all of a user's balance
     *         This function only return USDC back
     */
    function withdrawAll() external {
        require(userBalance[msg.sender] > 0, "Insufficient balance");
        withdraw(USDC, userBalance[msg.sender]);
    }

    /**
     * @notice Shield has 6 decimals
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Internal Functions ********************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Swap stablecoins in Platypus
     *
     * @param _pool        Platypus pool address
     * @param _fromToken   From token address
     * @param _toToken     To token address
     * @param _fromAmount  Amount of from token
     * @param _minToAmount Minimun output amount
     * @param _to          Address that will receive the output token
     */
    function _ptpSwap(
        address _pool,
        address _fromToken,
        address _toToken,
        uint256 _fromAmount,
        uint256 _minToAmount,
        address _to
    ) internal returns (uint256 actualAmount) {
        (actualAmount, ) = IPlatypusPool(_pool).swap(
            _fromToken,
            _toToken,
            _fromAmount,
            _minToAmount,
            _to,
            block.timestamp + 10
        );
    }

    /**
     * @notice Swap stablecoins in Curve
     *
     * @param _pool         Curve pool address
     * @param _fromToken    From token address
     * @param _toToken      To token address
     * @param _amountIn     Amount of from token
     * @param _minAmountOut Minimum output amount
     *
     * @return actualAmountOut Actual output amount after swap
     */
    function _curveSwap(
        address _pool,
        address _fromToken,
        address _toToken,
        uint256 _amountIn,
        uint256 _minAmountOut
    ) internal returns (uint256 actualAmountOut) {
        int128 indexFromToken = curvePoolTokenIndex[_pool][_fromToken];
        int128 indexToToken = curvePoolTokenIndex[_pool][_toToken];

        actualAmountOut = ICurvePool(_pool).exchange(
            indexFromToken,
            indexToToken,
            _amountIn,
            _minAmountOut
        );
    }

    /**
     * @notice Safe token transfer
     *
     * @param _token  Token address to be transferred
     * @param _amount Amount of token to be transferred
     *
     * @return realAmount Real amount that has been transferred
     */
    function _safeTokenTransfer(address _token, uint256 _amount)
        internal
        returns (uint256 realAmount)
    {
        uint256 balance = IERC20(_token).balanceOf(address(this));

        if (balance > _amount) {
            realAmount = _amount;
        } else {
            realAmount = balance;
        }
        IERC20(_token).safeTransfer(msg.sender, realAmount);
    }
}
