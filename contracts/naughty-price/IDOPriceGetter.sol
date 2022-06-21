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
import { IPriceGetter } from "./interfaces/IPriceGetter.sol";
import { IPolicyCore } from "./interfaces/IPolicyCore.sol";

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

    // WAVAX address
    address public constant WAVAX = 0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7;

    // Base price getter to transfer the price into USD
    IPriceGetter public basePriceGetter;

    IPolicyCore public policyCore;

    struct IDOPriceInfo {
        address pair; // Pair on TraderJoe
        uint256 decimals;
        uint256 sampleInterval;
        uint256 price0Average;
        uint256 price1Average;
        uint256 price0CumulativeLast;
        uint256 price1CumulativeLast;
        uint256 lastTimestamp;
        uint256 endTime;
    }
    // Policy Base Token Name => IDO Info
    mapping(string => IDOPriceInfo) priceFeeds;

    event SamplePrice(
        address policyToken,
        uint256 price0Average,
        uint256 price1Average,
        uint256 timestamp
    );

    function initialize(address _priceGetter, address _policyCore)
        public
        initializer
    {
        __Ownable_init();

        basePriceGetter = IPriceGetter(_priceGetter);
        policyCore = IPolicyCore(_policyCore);
    }

    function addIDOPair(
        string calldata _policyToken,
        address _pair,
        uint256 _decimals,
        uint256 _interval
    ) external onlyOwner {
        require(IUniswapV2Pair(_pair).token0 != address(0), "Non exist pair");

        IDOPriceInfo storage newFeed = priceFeeds[_policyToken];

        newFeed.pair = _pair;
        newFeed.decimals = _decimals;
        newFeed.sampleInterval = _interval;
    }

    function samplePrice(string calldata _policyToken) external {
        IDOPriceInfo storage priceFeed = priceFeeds[_policyToken];

        (
            uint256 price0Cumulative,
            uint256 price1Cumulative,
            uint32 blockTimestamp
        ) = UniswapV2OracleLibrary.currentCumulativePrices(priceFeed.pair);

        // Time between this sampling and last sampling (seconds)
        uint32 timeElapsed = blockTimestamp - priceFeed.lastTimestamp;

        require(
            timeElapsed > priceFeed.sampleInterval,
            "Minimum sample interval"
        );

        // Update price0Average and price1Average
        uint256 newPrice0Average = FixedPoint.uq112x112(
            uint224(
                (price0Cumulative - priceFeed.price0CumulativeLast) /
                    timeElapsed
            )
        );
        uint256 newPrice1Average = FixedPoint.uq112x112(
            uint224(
                (price1Cumulative - priceFeed.price1CumulativeLast) /
                    timeElapsed
            )
        );
        priceFeed.price0Average = newPrice0Average;
        priceFeed.price1Average = newPrice1Average;

        // Update price0CumulativeLast and price1CumulativeLast
        priceFeed.price0CumulativeLast = price0Cumulative;
        priceFeed.price1CumulativeLast = price1Cumulative;

        // Update lastTimestamp
        priceFeed.lastTimestamp = blockTimestamp;

        emit SamplePrice(
            _policyToken,
            newPrice0Average,
            newPrice1Average,
            blockTimestamp
        );
    }

    function getPrice(string calldata _policyToken)
        external
        view
        returns (uint256 price)
    {
        address pair = priceFeeds[_policyToken].pair;

        uint256 priceInAVAX;

        if (IUniswapV2Pair(pair).token0 == WAVAX) {
            priceInAVAX = priceFeeds[_policyToken].price1Average;
        } else {
            priceInAVAX = priceFeeds[_policyToken].price0Average;
        }

        // AVAX price, 1e18 scale
        uint256 avaxPrice = basePriceGetter.getLatestPrice("AVAX");

        // This final price is also multiplied by 1e18
        price = avaxPrice * priceInAVAX;
    }
}
