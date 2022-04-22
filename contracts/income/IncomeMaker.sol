// SPDX-License-Identifier: GPL-3.0-or-Later

pragma solidity ^0.8.10;

import "../naughty-price/interfaces/INaughtyRouter.sol";

/**
 * @title Degis Maker Contract
 * @dev This contract will receive the transaction fee from swap pool
 *      Then it will transfer
 */
contract IncomeMaker {
    INaughtyRouter public router;

    function initialize(address _router) public {
        router = INaughtyRouter(_router);
    }

    function transferIncomeToUSD() external {}

    function distribtue() external {}
}
