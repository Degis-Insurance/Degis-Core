// SPDX-License-Identifier: GPL-3.0-or-later
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

    constructor() Ownable(msg.sender) {}

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
