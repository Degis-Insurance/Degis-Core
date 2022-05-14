// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

import "../interfaces/INaughtyPair.sol";
import "../interfaces/INaughtyFactory.sol";
import "../interfaces/IPolicyCore.sol";



library NaughtyLibrary {
    /**
     * @notice Used when swap exact tokens for tokens (in is fixed)
     * @param factory Address of naughtyFactory contract
     * @param isBuying Whether the user is buying policy tokens
     * @param _amountIn Amount of tokens put in
     * @param _tokenIn Address of the input token
     * @param _tokenOut Address of the output token
     */
    function getAmountOut(
        address factory,
        bool isBuying,
        uint256 _amountIn,
        address _tokenIn,
        address _tokenOut
    ) internal view returns (uint256 amount) {
        (uint256 reserveA, uint256 reserveB) = getReserves(
            factory,
            _tokenIn,
            _tokenOut
        );

        // If tokenIn is stablecoin (isBuying), then tokeIn should be tokenB
        // Get the right order
        (uint256 reserveIn, uint256 reserveOut) = isBuying
            ? (reserveB, reserveA)
            : (reserveA, reserveB);

        amount = _calcAmountOut(_amountIn, reserveIn, reserveOut);
    }

    /**
     * @notice Used when swap tokens for exact tokens (out is fixed)
     * @param factory Address of naughtyFactory contract
     * @param isBuying Whether the user is buying policy tokens
     * @param _amountOut Amount of tokens given out
     * @param _tokenIn Address of the input token
     * @param _tokenOut Address of the output token
     */
    function getAmountIn(
        address factory,
        bool isBuying,
        uint256 _amountOut,
        address _tokenIn,
        address _tokenOut
    ) internal view returns (uint256 amount) {
        (uint256 reserveA, uint256 reserveB) = getReserves(
            factory,
            _tokenIn,
            _tokenOut
        );
        // If tokenIn is stablecoin (isBuying), then tokeIn should be tokenB
        // Get the right order
        (uint256 reserveIn, uint256 reserveOut) = isBuying
            ? (reserveB, reserveA)
            : (reserveA, reserveB);

        amount = _calcAmountIn(_amountOut, reserveIn, reserveOut);
    }

    /**
     * @notice given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset
     * @param _amountIn Amout of input tokens
     * @param _reserveIn Reserve of the input token
     * @param _reserveOut Reserve of the output token
     * @return amountOut Amount of output tokens
     */
    function _calcAmountOut(
        uint256 _amountIn,
        uint256 _reserveIn,
        uint256 _reserveOut
    ) internal pure returns (uint256 amountOut) {
        require(_amountIn > 0, "insufficient input amount");
        require(_reserveIn > 0 && _reserveOut > 0, "insufficient liquidity");

        uint256 amountInWithFee = _amountIn * 980;
        uint256 numerator = amountInWithFee * _reserveOut;
        uint256 denominator = _reserveIn * 1000 + amountInWithFee;

        amountOut = numerator / denominator;
    }

    /**
     * @notice given an output amount of an asset and pair reserves, returns a required input amount of the other asset
     * @param _amountOut Amout of output tokens
     * @param _reserveIn Reserve of the input token
     * @param _reserveOut Reserve of the output token
     * @return amountIn Amount of input tokens
     */
    function _calcAmountIn(
        uint256 _amountOut,
        uint256 _reserveIn,
        uint256 _reserveOut
    ) internal pure returns (uint256 amountIn) {
        require(_amountOut > 0, "insufficient output amount");
        require(_reserveIn > 0 && _reserveOut > 0, "insufficient liquidity");

        uint256 numerator = _reserveIn * _amountOut * 1000;
        uint256 denominator = (_reserveOut - _amountOut) * 980;
        amountIn = (numerator / denominator) + 1;
    }

    /**
     * @notice Fetche the reserves for a pair
     * @dev You need to sort the token order by yourself!
     *      No matter your input order, the return value will always start with policy token reserve.
     */
    function getReserves(
        address factory,
        address tokenA,
        address tokenB
    ) internal view returns (uint112 reserveA, uint112 reserveB) {
        address pairAddress = INaughtyFactory(factory).getPairAddress(
            tokenA,
            tokenB
        );

        // (Policy token reserve, stablecoin reserve)
        (reserveA, reserveB) = INaughtyPair(pairAddress).getReserves();
    }

    /**
     * @notice Get pair address
     * @param factory: Naughty price factory address
     * @param tokenA: TokenA address
     * @param tokenB: TokenB address
     */
    function getPairAddress(
        address factory,
        address tokenA,
        address tokenB
    ) internal view returns (address) {
        address pairAddress = INaughtyFactory(factory).getPairAddress(
            tokenA,
            tokenB
        );

        return pairAddress;
    }

    /**
     * @notice Given some amount of an asset and pair reserves, returns an equivalent amount of the other asset
     * @dev Used when add or remove liquidity
     * @param _amountA Amount of tokenA ( can be policytoken or stablecoin)
     * @param _reserveA Reserve of tokenA
     * @param _reserveB Reserve of tokenB
     */
    function quote(
        uint256 _amountA,
        uint256 _reserveA,
        uint256 _reserveB
    ) internal pure returns (uint256 amountB) {
        require(_amountA > 0, "insufficient amount");
        require(_reserveA > 0 && _reserveB > 0, "insufficient liquidity");

        amountB = (_amountA * _reserveB) / _reserveA;
    }

    /**
     * @notice Check if a token is stablecoin (supported in naughty price)
     * @param _policyCore Address of policyCore contract
     * @param _coinAddress Address of the token to be checked
     * @return isStablecoin Whether this token is a stablecoin
     */
    function checkStablecoin(address _policyCore, address _coinAddress)
        internal
        view
        returns (bool)
    {
        return IPolicyCore(_policyCore).supportedStablecoin(_coinAddress);
    }
}
