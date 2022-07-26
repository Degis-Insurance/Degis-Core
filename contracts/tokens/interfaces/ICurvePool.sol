// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.13;

interface ICurvePool {
    // Get the token address inside a curve stableswap pool
    function coins(uint256 _index) external view returns (address);

    // Get coin amount for the curve pool
    function N_COINS() external view returns (int128);

    // Do the exchange
    function exchange(
        int128 _indexForInToken,
        int128 _indexForOutToken,
        uint256 _amountIn,
        uint256 _minAmountOut
    ) external returns (uint256 actualAmount);
}
