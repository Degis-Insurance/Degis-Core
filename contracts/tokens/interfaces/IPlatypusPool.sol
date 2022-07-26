// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.13;

interface IPlatypusPool {
    function swap(
        address _fromToken,
        address _toToken,
        uint256 _amountIn,
        uint256 _minAmountOut,
        address _to,
        uint256 _deadline
    ) external returns (uint256 actualAmount, uint256 haircut);
}
