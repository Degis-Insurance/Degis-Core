// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

struct Ape {
    uint256 id;
}

library PublicLib {
    function mul(Ape storage x, uint256 y) external {
        x.id += y;
    }
}
