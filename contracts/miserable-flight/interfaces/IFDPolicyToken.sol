// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";

interface IFDPolicyToken is IERC721Enumerable {
    function mintPolicyToken(address _receiver) external;

    function tokenURI(uint256 _tokenId) external view returns (string memory);

    function getTokenURI(uint256 _tokenId)
        external
        view
        returns (string memory);
}
