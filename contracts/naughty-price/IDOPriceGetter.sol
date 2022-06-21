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

import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import { IUniswapV2Pair } from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import { FixedPoint } from "@uniswap/lib/contracts/libraries/FixedPoint.sol";
import { UniswapV2OracleLibrary } from "@uniswap/v2-periphery/contracts/libraries/UniswapV2OracleLibrary.sol";
import { UniswapV2Library } from "@uniswap/v2-periphery/contracts/libraries/UniswapV2Library.sol";

/**
 * @title Price Getter for IDO Protection
 *
 * @notice This is the contract for getting price feed from DEX
 *         IDO projects does not have Chainlink feeds so we use DEX TWAP price as oracle
 */

contract IDOPriceGetter is OwnableUpgradeable {
    using FixedPoint for *;
    struct IDOPriceInfo {
        address pair;
        uint256 decimals;
        uint256 price;
        uint256 endTime;
    }
    // Policy Token Address => IDO Info
    mapping(address => IDOPriceInfo) priceFeeds;

    function initialize() public initializer {
        __Ownable_init();
    }

    function samplePrice() external {}

    function getFinalPrice() external view returns (uint256 price) {}
}
