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
 *
 *         Workflow:
 *         1. Deploy naughty token for the IDO project and set its type as "IDO"
 *         2. Add ido price feed info by calling "addIDOPair" function
 *         3. Set auto tasks start within PERIOD to endTime to sample prices from DEX
 *         4. Call "settleFinalResult" function in core to settle the final price
 */

contract IDOPriceGetter is OwnableUpgradeable {
    using FixedPoint for *;

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constants **************************************** //
    // ---------------------------------------------------------------------------------------- //

    // WAVAX address
    address public constant WAVAX = 0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7;

    // Minimum period before endTime to start sampling
    uint256 public constant PERIOD = 60 * 60 * 24 * 2; // 2 days

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Variables **************************************** //
    // ---------------------------------------------------------------------------------------- //

    // Base price getter to transfer the price into USD
    IPriceGetter public basePriceGetter;

    // Policy Core contract
    IPolicyCore public policyCore;

    struct IDOPriceInfo {
        address pair; // Pair on TraderJoe
        uint256 decimals; // If no special settings, it would be 0
        uint256 sampleInterval;
        uint256 isToken0;
        uint256 priceAverage;
        uint256 priceCumulativeLast;
        uint256 lastTimestamp;
        uint256 startTime;
        uint256 endTime;
    }
    // Policy Base Token Name => IDO Info
    mapping(string => IDOPriceInfo) priceFeeds;

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Events ***************************************** //
    // ---------------------------------------------------------------------------------------- //

    event SamplePrice(
        address policyToken,
        uint256 priceAverage,
        uint256 timestamp
    );

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //

    function initialize(address _priceGetter, address _policyCore)
        public
        initializer
    {
        __Ownable_init();

        basePriceGetter = IPriceGetter(_priceGetter);
        policyCore = IPolicyCore(_policyCore);
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Set Functions ************************************* //
    // ---------------------------------------------------------------------------------------- //

    function addIDOPair(
        string calldata _policyToken,
        address _pair,
        uint256 _decimals,
        uint256 _interval,
        uint256 _startTime
    ) external onlyOwner {
        require(IUniswapV2Pair(_pair).token0 != address(0), "Non exist pair");

        IDOPriceInfo storage newFeed = priceFeeds[_policyToken];

        newFeed.pair = _pair;
        newFeed.decimals = _decimals;
        newFeed.sampleInterval = _interval;

        newFeed.isToken0 = IUniswapV2Pair(_pair).token0 == WAVAX ? 0 : 1;

        uint256 endTime = policyCore
            .getPolicyTokenInfo(_policyToken)
            .settleTimestamp;

        require(
            _startTime < endTime && _startTime + PERIOD,
            "Wrong start time"
        );

        emit NewIDOPair(
            _policyToken,
            _pair,
            _decimals,
            _interval,
            newFeed.isToken0
        );
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

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

        // Update priceAverage and priceCumulativeLast
        uint256 newPriceAverage;

        if (priceFeed.isToken0) {
            newPriceAverage = FixedPoint.uq112x112(
                uint224(
                    (price0Cumulative - priceFeed.price0CumulativeLast) /
                        timeElapsed
                )
            );

            priceFeed.priceCumulativeLast = price0Cumulative;
        } else {
            newPriceAverage = FixedPoint.uq112x112(
                uint224(
                    (price1Cumulative - priceFeed.price1CumulativeLast) /
                        timeElapsed
                )
            );

            priceFeed.priceCumulativeLast = price1Cumulative;
        }
        
        priceFeed.priceAverage = newPriceAverage;

        // Update lastTimestamp
        priceFeed.lastTimestamp = blockTimestamp;

        emit SamplePrice(_policyToken, newPriceAverage, blockTimestamp);
    }

    /**
     * @notice Get latest price
     *
     * @param _policyToken Policy token name
     *
     * @return price USD price of the base token
     */
    function getLatestPrice(string calldata _policyToken)
        external
        view
        returns (uint256 price)
    {
        address pair = priceFeeds[_policyToken].pair;

        uint256 priceInAVAX;

        // If token0 is WAVAX, use price1Average
        // Else, use price0Average
        priceInAVAX = priceFeeds[_policyToken].priceAverage;

        require(priceInAVAX > 0, "Zero Price");

        // AVAX price, 1e18 scale
        uint256 avaxPrice = basePriceGetter.getLatestPrice("AVAX");

        // This final price is also multiplied by 1e18
        price = avaxPrice * priceInAVAX;
    }
}
