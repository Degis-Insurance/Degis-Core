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

import { AggregatorV3Interface } from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import { Ownable } from "../utils/Ownable.sol";

/**
 * @title  Price Getter
 * @notice This is the contract for getting price feed from chainlink.
 *         The contract will keep a record from tokenName => priceFeed Address.
 *         Got the sponsorship and collaboration with Chainlink.
 * @dev    The price from chainlink priceFeed has different decimals, be careful.
 */
contract PriceGetter is Ownable {
    struct PriceFeedInfo {
        address priceFeedAddress;
        uint256 decimals;
    }
    // Use token name (string) as the mapping key
    // Should set the correct orginal token name
    mapping(string => PriceFeedInfo) public priceFeedInfo;

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Events ***************************************** //
    // ---------------------------------------------------------------------------------------- //
    event PriceFeedChanged(
        string tokenName,
        address feedAddress,
        uint256 decimals
    );

    event LatestPriceGet(
        uint80 roundID,
        int256 price,
        uint256 startedAt,
        uint256 timeStamp,
        uint80 answeredInRound
    );

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Constructor function, initialize some price feeds
     *         The first supported tokens are ARB, BTC and ETH
     */
    constructor() Ownable(msg.sender) {
        // Arbitrum data feed addresses and decimals
        priceFeedInfo["ARB"] = PriceFeedInfo(
            0xb2A824043730FE05F3DA2efaFa1CBbe83fa548D6,
            8
        );

        priceFeedInfo["ETH"] = PriceFeedInfo(
            0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612,
            8
        );

        priceFeedInfo["BTC"] = PriceFeedInfo(
            0x6ce185860a4963106506C203335A2910413708e9,
            8
        );
    }

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Modifiers ************************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Can not give zero address
     */
    modifier notZeroAddress(address _address) {
        require(_address != address(0), "Zero address");
        _;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ View Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Set Functions ************************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Set a price feed oracle address for a token
     * @dev Only callable by the owner
     *      The price result decimal should be less than 18
     * @param _tokenName   Address of the token
     * @param _feedAddress Price feed oracle address
     * @param _decimals    Decimals of this price feed service
     */
    function setPriceFeed(
        string memory _tokenName,
        address _feedAddress,
        uint256 _decimals
    ) public onlyOwner notZeroAddress(_feedAddress) {
        require(_decimals <= 18, "Too many decimals");
        priceFeedInfo[_tokenName] = PriceFeedInfo(_feedAddress, _decimals);

        emit PriceFeedChanged(_tokenName, _feedAddress, _decimals);
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Main Functions *********************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Get latest price of a token
     * @param _tokenName Address of the token
     * @return price The latest price
     */
    function getLatestPrice(string memory _tokenName) public returns (uint256) {
        PriceFeedInfo memory priceFeed = priceFeedInfo[_tokenName];

        (
            uint80 roundID,
            int256 price,
            uint256 startedAt,
            uint256 timeStamp,
            uint80 answeredInRound
        ) = AggregatorV3Interface(priceFeed.priceFeedAddress).latestRoundData();

        // require(price > 0, "Only accept price that > 0");
        if (price < 0) price = 0;

        emit LatestPriceGet(
            roundID,
            price,
            startedAt,
            timeStamp,
            answeredInRound
        );
        // Transfer the result decimals
        uint256 finalPrice = uint256(price) * (10 ** (18 - priceFeed.decimals));

        return finalPrice;
    }
}
