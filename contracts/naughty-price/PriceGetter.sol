// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "../utils/Ownable.sol";

/**
 * @title  Price Getter
 * @notice This is the contract for getting price feed from chainlink.
 *         The contract will keep a record from tokenName => priceFeed Address.
 *         Got the sponsorship and collaboration with Chainlink.
 */
contract PriceGetter is Ownable {
    // Use token name (string) as the mapping key
    mapping(string => AggregatorV3Interface) internal priceFeed;
    mapping(string => address) currentPriceFeed;

    event PriceFeedChanged(string tokenName, address feedAddress);

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

        // This is the rinkeby eth price feed
        // priceFeed["ETH"] = AggregatorV3Interface(
        //     0x8A753747A1Fa494EC906cE90E9f37563A8AF630e
        // );
        // currentPriceFeed["ETH"] = 0x8A753747A1Fa494EC906cE90E9f37563A8AF630e;

        // priceFeed["BTC"] = AggregatorV3Interface(
        //     0xECe365B379E1dD183B20fc5f022230C044d51404
        // );
        // currentPriceFeed["BTC"] = 0xECe365B379E1dD183B20fc5f022230C044d51404;

        // Uncomment below when launched on Avalanche Fuji
        priceFeed["AVAX"] = AggregatorV3Interface(
            0x5498BB86BC934c8D34FDA08E81D444153d0D06aD
        );

        priceFeed["ETH"] = AggregatorV3Interface(
            0x86d67c3D38D2bCeE722E601025C25a575021c6EA
        );

        priceFeed["BTC"] = AggregatorV3Interface(
            0x31CF013A08c6Ac228C94551d535d5BAfE19c602a
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

    /**
     * @notice Get the price feed address of a token
     * @param _tokenName Name of the strike token
     */
    function getPriceFeedAddress(string memory _tokenName)
        public
        view
        returns (address)
    {
        return address(priceFeed[_tokenName]);
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Set Functions ************************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Set a price feed oracle address for a token
     * @param _tokenName Address of the token
     * @param _feedAddress Price feed oracle address
     */
    function setPriceFeed(string memory _tokenName, address _feedAddress)
        public
        onlyOwner
        notZeroAddress(_feedAddress)
    {
        priceFeed[_tokenName] = AggregatorV3Interface(_feedAddress);
        currentPriceFeed[_tokenName] = _feedAddress;

        emit PriceFeedChanged(_tokenName, _feedAddress);
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Main Functions *********************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Get latest price of a token
     * @param _tokenName Address of the token
     * @return price The latest price
     */
    function getLatestPrice(string memory _tokenName) public returns (int256) {
        (
            uint80 roundID,
            int256 price,
            uint256 startedAt,
            uint256 timeStamp,
            uint80 answeredInRound
        ) = priceFeed[_tokenName].latestRoundData();

        emit LatestPriceGet(
            roundID,
            price,
            startedAt,
            timeStamp,
            answeredInRound
        );
        return price;
    }
}
