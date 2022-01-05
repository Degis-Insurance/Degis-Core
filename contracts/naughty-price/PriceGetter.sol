// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "../utils/Ownable.sol";

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

    /**
     * @notice Constructor function, initialize some price feed
     */
    constructor() {
        // At first, launch three kind of pools

        // Uncomment below when launched on Avalanche Fuji
        priceFeedInfo["AVAX"] = PriceFeedInfo(
            0x5498BB86BC934c8D34FDA08E81D444153d0D06aD,
            8
        );

        priceFeedInfo["ETH"] = PriceFeedInfo(
            0x86d67c3D38D2bCeE722E601025C25a575021c6EA,
            8
        );

        priceFeedInfo["BTC"] = PriceFeedInfo(
            0x31CF013A08c6Ac228C94551d535d5BAfE19c602a,
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
        require(_address != address(0), "can not give zero address");
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
     * @param _tokenName Address of the token
     * @param _feedAddress Price feed oracle address
     * @param _decimals Decimals of this price feed service
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
        uint256 finalPrice = uint256(price) * (10**(18 - priceFeed.decimals));

        return finalPrice;
    }
}
