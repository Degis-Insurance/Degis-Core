// SPDX-License-Identifier: GPL-3.0-or-Later

pragma solidity ^0.8.10;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../naughty-price/interfaces/INaughtyRouter.sol";

/**
 * @title Degis Maker Contract
 * @dev This contract will receive the transaction fee from swap pool
 *      Then it will transfer
 */
contract IncomeMaker is OwnableUpgradeable {
    INaughtyRouter public router;

    function initialize(address _router) public initializer {
        __Ownable_init();

        router = INaughtyRouter(_router);
    }

    function transferIncomeToUSD(address _policyToken) external {
        
    }

    function distribtue() external {}

    function emergencyWithdraw() external onlyOwner {}
}
