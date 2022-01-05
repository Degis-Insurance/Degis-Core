// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../tokens/interfaces/IBuyerToken.sol";

import "./interfaces/INPPolicyToken.sol";
import "./interfaces/INaughtyPair.sol";
import "./interfaces/INaughtyFactory.sol";
import "./interfaces/IPolicyCore.sol";

import "../utils/Ownable.sol";
import "../libraries/SafePRBMath.sol";

/**
 * @title  NaughtyRouter
 * @notice Router for the pool, you can add/remove liquidity or swap A for B.
 *         Swapping fee rate is 2% and all of them are given to LP.
 *         Very similar logic with Uniswap V2.
 *
 */
contract NaughtyRouter is Ownable {
    using SafeERC20 for IERC20;
    using SafeERC20 for INaughtyPair;
    using SafePRBMath for uint256;

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Variables **************************************** //
    // ---------------------------------------------------------------------------------------- //

    // Some other contracts
    address public factory;
    address public policyCore;
    address public buyerToken;

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Events ***************************************** //
    // ---------------------------------------------------------------------------------------- //

    event LiquidityAdded(
        address indexed pairAddress,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );

    event LiquidityRemoved(
        address indexed pairAddress,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //

    constructor(address _factory, address _buyerToken) {
        factory = _factory;
        buyerToken = _buyerToken;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************** Modifiers *************************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Transactions are available only before the deadline
     * @param _deadLine Deadline of the pool
     */
    modifier beforeDeadline(uint256 _deadLine) {
        require(block.timestamp < _deadLine, "expired transaction");
        _;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Set Functions ************************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Set the address of policyCore
     * @param _coreAddress Address of new policyCore
     */
    function setPolicyCore(address _coreAddress) external onlyOwner {
        policyCore = _coreAddress;
    }

    /**
     * @notice Set the address of buyer token
     * @param _buyerToken Address of new buyer token
     */
    function setBuyerToken(address _buyerToken) external onlyOwner {
        buyerToken = _buyerToken;
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Helper Functions *********************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Add liquidity but only provide stablecoins
     * @param _tokenA Address of policyToken
     * @param _tokenB Address of stablecoin
     * @param _amountUSD Amount of stablecoins provided
     * @param _to Address that receive the lp token, normally the user himself
     * @param _minRatio Minimum ratio (divided by 100)(amountMin / amountDesired)
     * @param _deadline Transaction will revert after this deadline
     */
    function addLiquidityWithUSD(
        address _tokenA,
        address _tokenB,
        uint256 _amountUSD,
        address _to,
        uint256 _minRatio,
        uint256 _deadline
    ) external beforeDeadline(_deadline) {
        require(_minRatio <= 100, "Minimum ratio can not exceed 100");

        require(_checkStablecoin(_tokenB), "Please put stablecoin as tokenB");

        (uint256 reserveA, uint256 reserveB) = _getReserves(_tokenA, _tokenB);

        require(reserveA > 0 && reserveB > 0, "No tokens in the pool");

        uint256 _amountADesired = _amountUSD.mul(reserveA).div(
            reserveA + reserveB
        );
        uint256 _amountBDesired = _amountUSD.mul(reserveB).div(
            reserveA + reserveB
        );

        // Mint _amountADesired policy tokens for users
        mintPolicyTokensForUser(
            _tokenA,
            _tokenB,
            _amountADesired,
            _msgSender()
        );

        {
            addLiquidity(
                _tokenA,
                _tokenB,
                _amountADesired,
                _amountBDesired,
                _amountADesired.mul(_minRatio).div(100),
                _amountBDesired.mul(_minRatio).div(100),
                _to,
                _deadline
            );
        }
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Add liquidity function
     * @param _tokenA Address of policyToken
     * @param _tokenB Address of stablecoin
     * @param _amountADesired Amount of policyToken desired
     * @param _amountBDesired Amount of stablecoin desired
     * @param _amountAMin Minimum amoutn of policy token
     * @param _amountBMin Minimum amount of stablecoin
     * @param _to Address that receive the lp token, normally the user himself
     * @param _deadline Transaction will revert after this deadline
     * @return amountA Amount of tokenA to be input
     * @return amountB Amount of tokenB to be input
     * @return liquidity LP token to be mint
     */
    function addLiquidity(
        address _tokenA,
        address _tokenB,
        uint256 _amountADesired,
        uint256 _amountBDesired,
        uint256 _amountAMin,
        uint256 _amountBMin,
        address _to,
        uint256 _deadline
    )
        public
        beforeDeadline(_deadline)
        returns (
            uint256 amountA,
            uint256 amountB,
            uint256 liquidity
        )
    {
        {
            (amountA, amountB) = _addLiquidity(
                _tokenA,
                _tokenB,
                _amountADesired,
                _amountBDesired,
                _amountAMin,
                _amountBMin
            );
        }

        address pair = _getPairAddress(_tokenA, _tokenB);

        transferHelper(_tokenA, _msgSender(), pair, amountA);
        transferHelper(_tokenB, _msgSender(), pair, amountB);

        liquidity = INaughtyPair(pair).mint(_to);

        emit LiquidityAdded(pair, amountA, amountB, liquidity);
    }

    /**
     * @notice Remove liquidity from the pool
     * @param _tokenA Address of policy token
     * @param _tokenB Address of stablecoin
     * @param _liquidity The lptoken amount to be removed
     * @param _amountAMin Minimum amount of tokenA given out
     * @param _amountBMin Minimum amount of tokenB given out
     * @param _to User address
     * @param _deadline Deadline of this transaction
     * @return amountA Amount of token0 given out
     * @return amountB Amount of token1 given out
     */
    function removeLiquidity(
        address _tokenA,
        address _tokenB,
        uint256 _liquidity,
        uint256 _amountAMin,
        uint256 _amountBMin,
        address _to,
        uint256 _deadline
    )
        public
        beforeDeadline(_deadline)
        returns (uint256 amountA, uint256 amountB)
    {
        address pair = _getPairAddress(_tokenA, _tokenB);

        INaughtyPair(pair).safeTransferFrom(_msgSender(), pair, _liquidity); // send liquidity to pair

        // Amount0: insurance token
        (amountA, amountB) = INaughtyPair(pair).burn(_to);

        require(amountA >= _amountAMin, "Insufficient insurance token amount");
        require(amountB >= _amountBMin, "Insufficient USDT token");

        emit LiquidityRemoved(pair, amountA, amountB, _liquidity);
    }

    /**
     * @notice Amount out is fixed
     * @param _amountInMax Maximum token input
     * @param _amountOut Fixed token output
     * @param _tokenIn Address of input token
     * @param _tokenOut Address of output token
     * @param _to User address
     * @param _deadline Deadline for this specific swap
     * @return amountIn Amounts to be really put in
     */
    function swapTokensforExactTokens(
        uint256 _amountInMax,
        uint256 _amountOut,
        address _tokenIn,
        address _tokenOut,
        address _to,
        uint256 _deadline
    ) external beforeDeadline(_deadline) returns (uint256 amountIn) {
        address pair = _getPairAddress(_tokenIn, _tokenOut);
        require(
            block.timestamp <= INaughtyPair(pair).deadline(),
            "This pool has been frozen for swapping"
        );

        bool isBuying = _checkStablecoin(_tokenIn);

        uint256 feeRate = INaughtyPair(pair).feeRate();

        // Get how many tokens should be put in (the order depends on isBuying)
        amountIn = _getAmountIn(
            isBuying,
            _amountOut,
            _tokenIn,
            _tokenOut,
            feeRate
        );

        require(amountIn <= _amountInMax, "excessive input amount");

        transferHelper(_tokenIn, _msgSender(), pair, amountIn);

        _swap(pair, amountIn, _amountOut, isBuying, _to);
    }

    /**
     * @notice Amount in is fixed
     * @param _amountIn Fixed token input
     * @param _amountOutMin Minimum token output
     * @param _tokenIn Address of input token
     * @param _tokenOut Address of output token
     * @param _to User address
     * @param _deadline Deadline for this specific swap
     * @return amountOut Amounts to be really given out
     */
    function swapExactTokensforTokens(
        uint256 _amountIn,
        uint256 _amountOutMin,
        address _tokenIn,
        address _tokenOut,
        address _to,
        uint256 _deadline
    ) external beforeDeadline(_deadline) returns (uint256 amountOut) {
        address pair = _getPairAddress(_tokenIn, _tokenOut);
        require(
            block.timestamp <= INaughtyPair(pair).deadline(),
            "This pool has been frozen for swapping"
        );

        // Check if the tokenIn is stablecoin
        bool isBuying = _checkStablecoin(_tokenIn);

        uint256 feeRate = INaughtyPair(pair).feeRate();

        // Get how many tokens should be given out (the order depends on isBuying)
        amountOut = _getAmountOut(
            isBuying,
            _amountIn,
            _tokenIn,
            _tokenOut,
            feeRate
        );
        require(amountOut >= _amountOutMin, "excessive output amount");

        transferHelper(_tokenIn, _msgSender(), pair, _amountIn);

        _swap(pair, _amountIn, amountOut, isBuying, _to);
    }

    /**
     * @notice Internal function to finish adding liquidity
     * @param _tokenA Address of tokenA
     * @param _tokenB Address of tokenB
     * @param _amountADesired Amount of tokenA to be added
     * @param _amountBDesired Amount of tokenB to be added
     * @param _amountAMin Minimum amount of tokenA
     * @param _amountBMin Minimum amount of tokenB
     * @return amountA Real amount of tokenA
     * @return amountB Real amount of tokenB
     */
    function _addLiquidity(
        address _tokenA,
        address _tokenB,
        uint256 _amountADesired,
        uint256 _amountBDesired,
        uint256 _amountAMin,
        uint256 _amountBMin
    ) private view returns (uint256 amountA, uint256 amountB) {
        require(_checkStablecoin(_tokenB), "Please put stablecoin as tokenB");

        (uint256 reserveA, uint256 reserveB) = _getReserves(_tokenA, _tokenB);

        if (reserveA == 0 && reserveB == 0) {
            (amountA, amountB) = (_amountADesired, _amountBDesired);
        } else {
            uint256 amountBOptimal = _quote(
                _amountADesired,
                reserveA,
                reserveB
            );
            if (amountBOptimal <= _amountBDesired) {
                require(amountBOptimal >= _amountBMin, "INSUFFICIENT_B_AMOUNT");
                (amountA, amountB) = (_amountADesired, amountBOptimal);
            } else {
                uint256 amountAOptimal = _quote(
                    _amountBDesired,
                    reserveB,
                    reserveA
                );
                require(amountAOptimal <= _amountADesired, "nonono");
                require(amountAOptimal >= _amountAMin, "INSUFFICIENT_A_AMOUNT");
                (amountA, amountB) = (amountAOptimal, _amountBDesired);
            }
        }
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Internal Functions ********************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Finish the erc20 transfer operation
     * @param _token ERC20 token address
     * @param _from Address to give out the token
     * @param _to Pair address to receive the token
     * @param _amount Transfer amount
     */
    function transferHelper(
        address _token,
        address _from,
        address _to,
        uint256 _amount
    ) internal {
        IERC20(_token).safeTransferFrom(_from, _to, _amount);
    }

    /**
     * @notice Finish swap process
     * @param _pair Address of the pair
     * @param _amountIn Amount of tokens put in
     * @param _amountOut Amount of tokens get out
     * @param _isBuying Whether this is a purchase or a sell
     * @param _to Address of the user
     */
    function _swap(
        address _pair,
        uint256 _amountIn,
        uint256 _amountOut,
        bool _isBuying,
        address _to
    ) internal {
        // Only give buyer tokens when this is a purchase
        if (_isBuying) {
            IBuyerToken(buyerToken).mintBuyerToken(_msgSender(), _amountIn);
        }

        // If the user is buying policies => amount1Out = 0
        // One of these two variables will be 0
        uint256 amountAOut = _isBuying ? _amountOut : 0;
        uint256 amountBOut = _isBuying ? 0 : _amountOut;

        INaughtyPair(_pair).swap(amountAOut, amountBOut, _to);
    }

    /**
     * @notice Used when users only provide stablecoins and want to mint & add liquidity in one step
     * @dev Need have approval before
     * @param _policyTokenAddress Address of the policy token
     * @param _stablecoin Address of the stablecoin
     * @param _amount Amount to be used for minting policy tokens
     * @param _userAddress The user's address
     */
    function mintPolicyTokensForUser(
        address _policyTokenAddress,
        address _stablecoin,
        uint256 _amount,
        address _userAddress
    ) internal {
        // Find the policy token name
        string memory policyTokenName = IPolicyCore(policyCore)
            .findNamebyAddress(_policyTokenAddress);

        IPolicyCore(policyCore).delegateDeposit(
            policyTokenName,
            _stablecoin,
            _amount,
            _userAddress
        );
    }

    function _checkStablecoin(address _tokenAddress)
        internal
        view
        returns (bool)
    {
        return IPolicyCore(policyCore).supportedStablecoin(_tokenAddress);
    }

    /**
     * @notice Fetche the reserves for a pair
     * @dev You need to sort the token order by yourself!
     *      No matter your input order, the return value will always start with policy token reserve.
     */
    function _getReserves(address tokenA, address tokenB)
        internal
        view
        returns (uint112 reserveA, uint112 reserveB)
    {
        address pairAddress = INaughtyFactory(factory).getPairAddress(
            tokenA,
            tokenB
        );

        // (Policy token reserve, stablecoin reserve)
        (reserveA, reserveB) = INaughtyPair(pairAddress).getReserves();
    }

    /**
     * @notice Get pair address
     * @param tokenA TokenA address
     * @param tokenB TokenB address
     */
    function _getPairAddress(address tokenA, address tokenB)
        internal
        view
        returns (address)
    {
        address pairAddress = INaughtyFactory(factory).getPairAddress(
            tokenA,
            tokenB
        );

        return pairAddress;
    }

    /**
     * @notice Used when swap exact tokens for tokens (in is fixed)
     * @param isBuying Whether the user is buying policy tokens
     * @param _amountIn Amount of tokens put in
     * @param _tokenIn Address of the input token
     * @param _tokenOut Address of the output token
     */
    function _getAmountOut(
        bool isBuying,
        uint256 _amountIn,
        address _tokenIn,
        address _tokenOut,
        uint256 _feeRate
    ) internal view returns (uint256 amountOut) {
        (uint256 reserveA, uint256 reserveB) = _getReserves(
            _tokenIn,
            _tokenOut
        );

        // If tokenIn is stablecoin (isBuying), then tokeIn should be tokenB
        // Get the right order
        (uint256 reserveIn, uint256 reserveOut) = isBuying
            ? (reserveB, reserveA)
            : (reserveA, reserveB);

        require(_amountIn > 0, "insufficient input amount");
        require(reserveIn > 0 && reserveOut > 0, "insufficient liquidity");

        uint256 amountInWithFee = _amountIn * (1000 - _feeRate);
        uint256 numerator = amountInWithFee.mul(reserveOut);
        uint256 denominator = reserveIn * 1000 + amountInWithFee;

        amountOut = numerator.div(denominator);
    }

    /**
     * @notice Used when swap tokens for exact tokens (out is fixed)
     * @param isBuying Whether the user is buying policy tokens
     * @param _amountOut Amount of tokens given out
     * @param _tokenIn Address of the input token
     * @param _tokenOut Address of the output token
     */
    function _getAmountIn(
        bool isBuying,
        uint256 _amountOut,
        address _tokenIn,
        address _tokenOut,
        uint256 _feeRate
    ) internal view returns (uint256 amountIn) {
        (uint256 reserveA, uint256 reserveB) = _getReserves(
            _tokenIn,
            _tokenOut
        );
        // If tokenIn is stablecoin (isBuying), then tokeIn should be tokenB
        // Get the right order
        (uint256 reserveIn, uint256 reserveOut) = isBuying
            ? (reserveB, reserveA)
            : (reserveA, reserveB);

        require(_amountOut > 0, "insufficient output amount");
        require(reserveIn > 0 && reserveOut > 0, "insufficient liquidity");

        uint256 numerator = reserveIn.mul(_amountOut) * 1000;
        uint256 denominator = (reserveOut - _amountOut) * (1000 - _feeRate);

        amountIn = numerator.div(denominator) + 1;
    }

    /**
     * @notice Given some amount of an asset and pair reserves, returns an equivalent amount of the other asset
     * @dev Used when add or remove liquidity
     * @param _amountA Amount of tokenA ( can be policytoken or stablecoin)
     * @param _reserveA Reserve of tokenA
     * @param _reserveB Reserve of tokenB
     */
    function _quote(
        uint256 _amountA,
        uint256 _reserveA,
        uint256 _reserveB
    ) internal pure returns (uint256 amountB) {
        require(_amountA > 0, "insufficient amount");
        require(_reserveA > 0 && _reserveB > 0, "insufficient liquidity");

        amountB = _amountA.mul(_reserveB).div(_reserveA);
    }
}
