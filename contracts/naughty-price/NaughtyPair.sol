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

import {Math} from "../libraries/Math.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "../utils/ReentrancyGuard.sol";
import {INaughtyFactory} from "./interfaces/INaughtyFactory.sol";

/**
 * @title  Naughty Pair
 * @notice This is the contract for the naughtyPrice swapping pair.
 *         Every time a new naughtyPrice product is online you need to deploy this contract.
 *         The contract will be initialized with two tokens and a deadline.
 *         Token0 will be policy tokens and token1 will be stablecoins.
 *         The swaps are only availale before the deadline.
 */
contract NaughtyPair is ERC20("Naughty Pool LP", "NLP"), ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Variables **************************************** //
    // ---------------------------------------------------------------------------------------- //

    // Minimum liquidity locked
    uint256 public constant MINIMUM_LIQUIDITY = 10**3;

    // naughtyFactory contract address
    address public factory;

    // Token addresses in the pool
    address public token0; // Insurance Token
    address public token1; // USDT

    uint112 private reserve0; // Amount of Insurance Token
    uint112 private reserve1; // Amount of USDT

    // Used for modifiers
    bool public unlocked = true;

    // Every pool will have a deadline
    uint256 public deadline;

    // Fee Rate, given to LP holders (0 ~ 1000)
    uint256 public feeRate;

    // reserve0 * reserve1
    uint256 public kLast;

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Events ***************************************** //
    // ---------------------------------------------------------------------------------------- //

    event ReserveUpdated(uint256 reserve0, uint256 reserve1);
    event Swap(
        address indexed sender,
        uint256 amountAIn,
        uint256 amountBIn,
        uint256 amountAOut,
        uint256 amountBOut,
        address indexed to
    );

    event Mint(address indexed sender, uint256 amountA, uint256 amountB);
    event Burn(
        address indexed sender,
        uint256 amountA,
        uint256 amountB,
        address indexed to
    );

    constructor() {
        factory = msg.sender; // deployed by factory contract
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************** Modifiers *************************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Can not swap after the deadline
     * @dev Each pool will have a deadline and it was set when deployed
     *      Does not apply to income maker contract
     */
    modifier beforeDeadline() {
        if (msg.sender != INaughtyFactory(factory).incomeMaker()) {
            require(block.timestamp <= deadline, "Can not swap after deadline");
        }
        _;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Init Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Initialize the contract status after the deployment by factory
     * @param _token0 Token0 address (policy token address)
     * @param _token1 Token1 address (stablecoin address)
     * @param _deadline Deadline for this pool
     * @param _feeRate Fee rate to LP holders (1000 <=> 100%)
     */
    function initialize(
        address _token0,
        address _token1,
        uint256 _deadline,
        uint256 _feeRate
    ) external {
        require(
            msg.sender == factory,
            "can only be initialized by the factory contract"
        );
        require(_feeRate <= 1000, "feeRate over 1.0");

        token0 = _token0;
        token1 = _token1;

        // deadline for the whole pool after which no swap will be allowed
        deadline = _deadline;

        feeRate = _feeRate;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ View Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Get reserve0 (Policy token) and reserve1 (stablecoin).
     * @dev This function always put policy token at the first place!
     * @return _reserve0 Reserve of token0
     * @return _reserve1 Reserve of token1
     */
    function getReserves()
        public
        view
        returns (uint112 _reserve0, uint112 _reserve1)
    {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Mint LP Token to liquidity providers
     *         Called when adding liquidity.
     * @param to The user address
     * @return liquidity The LP token amount
     */
    function mint(address to)
        external
        nonReentrant
        returns (uint256 liquidity)
    {
        (uint112 _reserve0, uint112 _reserve1) = getReserves(); // gas savings

        uint256 balance0 = IERC20(token0).balanceOf(address(this)); // policy token balance after deposit
        uint256 balance1 = IERC20(token1).balanceOf(address(this)); // stablecoin balance after deposit

        uint256 amount0 = balance0 - _reserve0; // just deposit
        uint256 amount1 = balance1 - _reserve1;

        // Distribute part of the fee to income maker
        bool feeOn = _mintFee(_reserve0, _reserve1);

        uint256 _totalSupply = totalSupply(); // gas savings
        if (_totalSupply == 0) {
            // No liquidity = First add liquidity
            liquidity = Math.sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            // Keep minimum liquidity to this contract
            _mint(factory, MINIMUM_LIQUIDITY); // permanently lock the first MINIMUM_LIQUIDITY tokens
        } else {
            liquidity = min(
                (amount0 * _totalSupply) / _reserve0,
                (amount1 * _totalSupply) / _reserve1
            );
        }

        require(liquidity > 0, "insufficient liquidity minted");
        _mint(to, liquidity);

        _update(balance0, balance1);

        if (feeOn) kLast = reserve0 * reserve1;

        emit Mint(msg.sender, amount0, amount1);
    }

    /**
     * @notice Burn LP tokens give back the original tokens
     * @param _to User address
     * @return amount0 Amount of token0 to be sent back
     * @return amount1 Amount of token1 to be sent back
     */
    function burn(address _to)
        external
        nonReentrant
        returns (uint256 amount0, uint256 amount1)
    {
        // gas savings
        (uint112 _reserve0, uint112 _reserve1) = getReserves();
        address _token0 = token0;
        address _token1 = token1;

        uint256 balance0 = IERC20(_token0).balanceOf(address(this)); // policy token balance
        uint256 balance1 = IERC20(_token1).balanceOf(address(this)); // stablecoin balance

        uint256 liquidity = balanceOf(address(this));

        bool feeOn = _mintFee(_reserve0, _reserve1);

        uint256 _totalSupply = totalSupply(); // gas savings

        // How many tokens to be sent back
        amount0 = (liquidity * balance0) / _totalSupply;
        amount1 = (liquidity * balance1) / _totalSupply;

        require(amount0 > 0 && amount1 > 0, "Insufficient liquidity burned");

        // Currently all the liquidity in the pool was just sent by the user, so burn all
        _burn(address(this), liquidity);

        // Transfer tokens out and update the balance
        IERC20(_token0).safeTransfer(_to, amount0);
        IERC20(_token1).safeTransfer(_to, amount1);
        balance0 = IERC20(_token0).balanceOf(address(this));
        balance1 = IERC20(_token1).balanceOf(address(this));

        _update(balance0, balance1);

        if (feeOn) kLast = reserve0 * reserve1;

        emit Burn(msg.sender, amount0, amount1, _to);
    }

    /**
     * @notice Finish the swap process
     * @param _amount0Out Amount of token0 to be given out (may be 0)
     * @param _amount1Out Amount of token1 to be given out (may be 0)
     * @param _to Address to receive the swap result
     */
    function swap(
        uint256 _amount0Out,
        uint256 _amount1Out,
        address _to
    ) external beforeDeadline nonReentrant {
        require(
            _amount0Out > 0 || _amount1Out > 0,
            "Output amount need to be > 0"
        );

        (uint112 _reserve0, uint112 _reserve1) = getReserves(); // gas savings
        require(
            _amount0Out < _reserve0 && _amount1Out < _reserve1,
            "Not enough liquidity"
        );

        uint256 balance0;
        uint256 balance1;
        {
            // scope for _token{0,1}, avoids stack too deep errors
            address _token0 = token0;
            address _token1 = token1;
            require(_to != _token0 && _to != _token1, "INVALID_TO");

            if (_amount0Out > 0) IERC20(_token0).safeTransfer(_to, _amount0Out);
            if (_amount1Out > 0) IERC20(_token1).safeTransfer(_to, _amount1Out);

            balance0 = IERC20(_token0).balanceOf(address(this));
            balance1 = IERC20(_token1).balanceOf(address(this));
        }
        uint256 amount0In = balance0 > _reserve0 - _amount0Out
            ? balance0 - (_reserve0 - _amount0Out)
            : 0;
        uint256 amount1In = balance1 > _reserve1 - _amount1Out
            ? balance1 - (_reserve1 - _amount1Out)
            : 0;

        require(amount0In > 0 || amount1In > 0, "INSUFFICIENT_INPUT_AMOUNT");

        {
            uint256 balance0Adjusted = balance0 * 1000 - amount0In * feeRate;
            uint256 balance1Adjusted = balance1 * 1000 - amount1In * feeRate;

            require(
                balance0Adjusted * balance1Adjusted >=
                    _reserve0 * _reserve1 * (1000**2),
                "The remaining x*y is less than K"
            );
        }

        _update(balance0, balance1);

        emit Swap(
            msg.sender,
            amount0In,
            amount1In,
            _amount0Out,
            _amount1Out,
            _to
        );
    }

    /**
     * @notice Syncrinize the status of this pool
     */
    function sync() external nonReentrant {
        _update(
            IERC20(token0).balanceOf(address(this)),
            IERC20(token1).balanceOf(address(this))
        );
    }

    // ---------------------------------------------------------------------------------------- //
    // ********************************** Internal Functions ********************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Update the reserves of the pool
     * @param balance0 Balance of token0
     * @param balance1 Balance of token1
     */
    function _update(uint256 balance0, uint256 balance1) private {
        uint112 MAX_NUM = type(uint112).max;
        require(balance0 <= MAX_NUM && balance1 <= MAX_NUM, "Uint112 OVERFLOW");

        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);

        emit ReserveUpdated(reserve0, reserve1);
    }

    /**
     * @notice Get the smaller one of two numbers
     * @param x The first number
     * @param y The second number
     * @return z The smaller one
     */
    function min(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = x < y ? x : y;
    }

    function _mintFee(uint112 _reserve0, uint112 _reserve1)
        private
        returns (bool feeOn)
    {
        address incomeMaker = INaughtyFactory(factory).incomeMaker();

        // If incomeMaker is not zero address, fee is on
        feeOn = incomeMaker != address(0);

        uint256 _k = kLast;

        if (feeOn) {
            if (_k != 0) {
                uint256 rootK = Math.sqrt(_reserve0 * _reserve1);
                uint256 rootKLast = Math.sqrt(_k);

                if (rootK > rootKLast) {
                    uint256 numerator = totalSupply() *
                        (rootK - rootKLast) *
                        10;

                    // (1 / φ) - 1
                    // Proportion got from factory is based on 100
                    // Use 1000/proportion to make it divided (donominator and numerator both * 10)
                    // p = 40 (2/5) => 1000/40 = 25
                    uint256 incomeMakerProportion = INaughtyFactory(factory)
                        .incomeMakerProportion();
                    uint256 denominator = rootK *
                        (1000 / incomeMakerProportion - 10) +
                        rootKLast *
                        10;

                    uint256 liquidity = numerator / denominator;

                    // Mint the liquidity to income maker contract
                    if (liquidity > 0) _mint(incomeMaker, liquidity);
                }
            }
        } else if (_k != 0) {
            kLast = 0;
        }
    }
}
