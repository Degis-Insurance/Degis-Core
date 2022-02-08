// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "../utils/Ownable.sol";
import "../libraries/StringsUtils.sol";

contract PriceFeedMock is Ownable {
    using StringsUtils for uint256;

    struct PriceFeedInfo {
        address priceFeedAddress;
        uint256 decimals;
    }
    // Use token name (string) as the mapping key
    mapping(string => PriceFeedInfo) public priceFeedInfo;

    uint256 public roundId;

    uint256 public result;

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Events ***************************************** //
    // ---------------------------------------------------------------------------------------- //
    event PriceFeedChanged(
        string tokenName,
        address feedAddress,
        uint256 decimals
    );

    event LatestPriceGet(uint256 roundID, uint256 price);

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //

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
     * @dev For test, you can set the result you want
     */
    function setResult(uint256 _result) public {
        result = _result;
    }

    /**
     * @notice Get latest price of a token
     * @param _tokenName Address of the token
     * @return price The latest price
     */
    function getLatestPrice(string memory _tokenName) public returns (uint256) {
        uint256 price = result;

        // require(price > 0, "Only accept price that > 0");
        if (price < 0) price = 0;

        emit LatestPriceGet(roundId, price);

        roundId += 1;

        uint256 finalPrice = uint256(price);

        return finalPrice;
    }
}
