// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @notice MockERC20 for test
 * @dev MockUSD has 6 decimals, this contract is 18 decimals
 */
contract MockERC20 is ERC20 {
    constructor() ERC20("MockERC20", "ERC20") {}

    // Everyone can mint, have fun for test
    function mint(address _account, uint256 _amount) public {
        _mint(_account, _amount);
    }
}
