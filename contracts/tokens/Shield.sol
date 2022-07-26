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

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Variables **************************************** //
    // ---------------------------------------------------------------------------------------- //

    // PTP Main Pool: USDC + USDT + USDC.e + USDT.e + DAI.e
    address public constant PTP_MAIN =
        0x66357dCaCe80431aee0A7507e2E361B7e2402370;

    // Curve YUSD pool: YUSD + USDT + USDC
    address public constant CURVE_YUSD =
        0x1da20Ac34187b2d9c74F729B85acB225D3341b25;

    // address public USDCeUSDCPOOL; // 0x3a43A5851A3e3E0e25A3c1089670269786be1577;
    // address public aTRICURVEPOOL; // 0xB755B949C126C04e0348DD881a5cF55d424742B2;

    // Stablecoin => whether supported
    mapping(address => bool) public supportedStablecoin;

    // All supporting swap pools
    mapping(string => address) public pools;

    // User staked USDC balance
    mapping(address => uint256) public userBalance;

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

        // Actual shield amount
        uint256 outAmount;

        // Transfer stablecoin to this contract
        IERC20(_stablecoin).safeTransferFrom(
            msg.sender,
            address(this),
            _amount
        );

        if (_stablecoin != USDC) {
            // Swap stablecoin to USDC and directly goes to this contract
            outAmount = _swap(
                _type,
                _stablecoin,
                USDC,
                _amount,
                _minAmount,
                address(this)
            );
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
     * @notice Finish the swap process
     *
     * @param _type        Swap type
     * @param _fromToken   Input token address
     * @param _toToken     Taget token address
     * @param _fromAmount  Input stablecoin amount
     * @param _minToAmount Minimum amount output
     * @param _to          Address to receive the tokens
     */
    function _swap(
        uint256 _type,
        address _fromToken,
        address _toToken,
        uint256 _fromAmount,
        uint256 _minToAmount,
        address _to
    ) internal returns (uint256 actualAmount) {
        // PTP Main swap
        if (_type == 0) {
            actualAmount = _ptpSwap(
                _fromToken,
                _toToken,
                _fromAmount,
                _minToAmount,
                _to
            );
        }
        // Curve YUSD swap
        else if (_type == 1) {
            actualAmount = _curveSwap(
                CURVE_YUSD,
                _fromToken,
                _toToken,
                _fromAmount,
                _minToAmount
            );
        } else revert("Deposit swap failed");
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

        if (_stablecoin == USDC) withdraw(_amount);
        else if (_type == 0) {
            // Swap USDC to stablecoin and directly
            uint256 actualAmount = _ptpSwap(
                USDC,
                _stablecoin,
                _amount,
                _minAmount,
                address(this)
            );

            withdraw(actualAmount);
        }
    }

    /**
     * @notice Withdraw stablecoins
     *
     * @param _amount Amount of Shield to be burned
     */
    function withdraw(uint256 _amount) public {
        // Transfer USDC back
        uint256 realAmount = _safeTokenTransfer(USDC, _amount);

        userBalance[msg.sender] -= realAmount;

        // Burn shield token
        _burn(msg.sender, realAmount);

        // Transfer USDC back
        IERC20(USDC).safeTransfer(msg.sender, _amount);

        emit Withdraw(msg.sender, realAmount);
    }

    /**
     * @notice Withdraw all of a user's balance
     */
    function withdrawAll() external {
        require(userBalance[msg.sender] > 0, "Insufficient balance");
        withdraw(userBalance[msg.sender]);
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
     * @notice Swap stablecoin to USDC in Platypus
     *
     * @param _fromToken   From token address
     * @param _toToken     To token address
     * @param _fromAmount  Amount of from token
     * @param _minToAmount Minimun output amount
     * @param _to          Address that will receive the output token
     */
    function _ptpSwap(
        address _fromToken,
        address _toToken,
        uint256 _fromAmount,
        uint256 _minToAmount,
        address _to
    ) internal returns (uint256 actualAmount) {
        // Calldata for Platypus swap function
        // bytes memory data = abi.encodeWithSignature(
        //     "swap(address,address,uint256,uint256,address,uint256)",
        //     _fromToken,
        //     _toToken,
        //     _fromAmount,
        //     _minToAmount,
        //     _to,
        //     _deadline
        // );

        // (bool success, bytes memory res) = PTP_MAIN.call(data);

        (actualAmount, ) = IPlatypusPool(PTP_MAIN).swap(
            _fromToken,
            _toToken,
            _fromAmount,
            _minToAmount,
            _to,
            block.timestamp + 10
        );

        // require(success, "PTP swap failed");

        // (actualAmount, ) = abi.decode(res, (uint256, uint256));
    }

    function _curveSwap(
        address _pool,
        address _fromToken,
        address _toToken,
        uint256 _amountIn,
        uint256 _minAmountOut
    ) internal returns (uint256 actualAmountOut) {
        int128 indexFromToken = _getCurveIndex(_pool, _fromToken);
        int128 indexToToken = _getCurveIndex(_pool, _toToken);

        actualAmountOut = ICurvePool(_pool).exchange(
            indexFromToken,
            indexToToken,
            _amountIn,
            _minAmountOut
        );
    }

    /**
     * @notice Get curve token index
     */
    function _getCurveIndex(address _pool, address _token)
        internal
        returns (int128)
    {
        int128 length = (ICurvePool(_pool).N_COINS());

        for (int128 i; i < length; ) {
            if (ICurvePool(_pool).coins(uint128(i)) == _token) {
                return i;
            }

            unchecked {
                ++i;
            }
        }

        // If no index is found, revert
        revert("Token not in the pool");
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
