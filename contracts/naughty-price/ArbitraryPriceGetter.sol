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
import { IPolicyCore } from "./interfaces/IPolicyCore.sol";

/**
 * @title Price Getter for arbitrary contract
 *
 * @notice This is the contract for getting price feed from arbitrary contract
 *         A special case of PriceGetter, not a normal "token price"
 */

contract ArbitraryPriceGetter is OwnableUpgradeable {
    // ---------------------------------------------------------------------------------------- //
    // ************************************* Variables **************************************** //
    // ---------------------------------------------------------------------------------------- //

    // Policy Core contract
    IPolicyCore public policyCore;

    struct PriceInfo {
        address contractAddress; // Contract address
        string functionSignature; // Function signature to get price
        bytes callData;
    }
    // Policy Base Token Name => Price Feed Info
    mapping(string => PriceInfo) public priceFeeds;

    mapping(string => string) public baseTokens;

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Events ***************************************** //
    // ---------------------------------------------------------------------------------------- //

    event SamplePrice(string policyToken, uint256 price);

    event NewPair(
        string policyToken,
        address contractAddress,
        string functionSignature
    );

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //

    function initialize(address _policyCore) public initializer {
        __Ownable_init();

        policyCore = IPolicyCore(_policyCore);
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Set Functions ************************************* //
    // ---------------------------------------------------------------------------------------- //

    function addPair(
        string calldata _baseToken,
        address _contractAddress,
        string calldata _functionSignature,
        bytes calldata _calldata
    ) external onlyOwner {
        require(
            priceFeeds[_baseToken].contractAddress == address(0),
            "Pair already exists"
        );

        PriceInfo storage newFeed = priceFeeds[_baseToken];

        newFeed.contractAddress = _contractAddress;
        newFeed.functionSignature = _functionSignature;
        newFeed.callData = _calldata;

        require(
            bytes4(keccak256(bytes(_functionSignature))) ==
                bytes4(_calldata[0:4]),
            "Signature and calldata not match"
        );
        (bool success, bytes memory res) = _contractAddress.call(_calldata);

        require(success, "Call failed");
        uint256 priceResult = abi.decode(res, (uint256));

        require(priceResult > 0, "Invalid price result");

        emit NewPair(_baseToken, _contractAddress, _functionSignature);
    }

    function setBaseToken(string memory _policyToken, string memory _baseToken)
        external
        onlyOwner
    {
        baseTokens[_policyToken] = _baseToken;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Get latest price
     *
     * @param _policyToken Policy token name
     *
     * @return price USD price of the base token (1e18 decimal)
     */
    function getLatestPrice(string calldata _policyToken)
        external
        returns (uint256 price)
    {
        string memory baseToken = baseTokens[_policyToken];

        bytes memory data = priceFeeds[baseToken].callData;

        (bool success, bytes memory res) = priceFeeds[baseToken]
            .contractAddress
            .call(data);

        require(success, "Call failed");

        uint256 rawPrice = abi.decode(res, (uint256));
        require(rawPrice > 0, "Invalid price result");

        // Price result should be in 1e18 decimal
        price = rawPrice * 10**12;

        emit SamplePrice(_policyToken, price);
    }
}
