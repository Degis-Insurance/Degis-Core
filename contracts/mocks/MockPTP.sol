// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockPTP {
    function swap(
        address fromToken,
        address toToken,
        uint256 fromAmount,
        uint256 minimumToAmount,
        address to,
        uint256 deadline
    ) external returns (uint256 actualToAmount, uint256 haircut) {
        require(block.timestamp < deadline, "Deadline has passed");
        require(fromToken != address(0), "ZERO");
        require(toToken != address(0), "ZERO");
        require(fromToken != toToken, "SAME_ADDRESS");
        require(fromAmount > 0, "ZERO_FROM_AMOUNT");
        require(to != address(0), "ZERO");

        IERC20 fromERC20 = IERC20(fromToken);
        // Asset fromAsset = _assetOf(fromToken);
        // Asset toAsset = _assetOf(toToken);

        // // Intrapool swapping only
        // require(
        //     toAsset.aggregateAccount() == fromAsset.aggregateAccount(),
        //     "DIFF_AGG_ACC"
        // );

        // (actualToAmount, haircut) = _quoteFrom(fromAsset, toAsset, fromAmount);

        fromERC20.transferFrom(msg.sender, fromToken, fromAmount);

        actualToAmount = fromAmount;
        haircut = 0;

        require(minimumToAmount <= actualToAmount, "AMOUNT_TOO_LOW");
        // fromAsset.addCash(fromAmount);
        // toAsset.removeCash(actualToAmount);
        // toAsset.addLiability(_dividend(haircut, _retentionRatio));
        // toAsset.transferUnderlyingToken(to, actualToAmount);
    }
}
