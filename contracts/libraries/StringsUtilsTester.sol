// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

import "./StringsUtils.sol";

contract StringsUtilsTester {
    function byToString(bytes32 _bytes) public pure returns (string memory) {
        return StringsUtils.byToString(_bytes);
    }

    function addressToString(address _addr)
        public
        pure
        returns (string memory)
    {
        return StringsUtils.addressToString(_addr);
    }

    /**
     * @dev Converts a `uint256` to its ASCII `string` decimal representation.
     */
    function uintToString(uint256 value) public pure returns (string memory) {
        return StringsUtils.uintToString(value);
    }

    function uintToHexString(uint256 value)
        public
        pure
        returns (string memory)
    {
        return StringsUtils.uintToHexString(value);
    }

    /**
     * @dev Converts a `uint256` to its ASCII `string` hexadecimal representation with fixed length.
     */
    function uintToHexString(uint256 value, uint256 length)
        public
        pure
        returns (string memory)
    {
        return StringsUtils.uintToHexString(value, length);
    }
}
