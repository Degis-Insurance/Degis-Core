// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IPriceGetter {
    function getPriceFeedAddress(string memory _tokenName)
        external
        view
        returns (address);

    function setPriceFeed(string memory _tokenName, address _feedAddress)
        external;

    function getLatestPrice(string memory _tokenName) external returns (int256);
}
