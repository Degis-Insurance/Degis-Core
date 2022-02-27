// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";

interface IFDPolicyToken is IERC721Enumerable {
    function mintPolicyToken(address _receiver) external;

    function tokenURI(uint256 _tokenId) external view returns (string memory);

    function getTokenURI(uint256 _tokenId)
        external
        view
        returns (string memory);
}
