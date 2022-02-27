// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

interface IPriceGetter {
    function getPriceFeedAddress(string memory _tokenName)
        external
        view
        returns (address);

    function setPriceFeed(string memory _tokenName, address _feedAddress)
        external;

    function getLatestPrice(string memory _tokenName)
        external
        returns (uint256 _price);
}
