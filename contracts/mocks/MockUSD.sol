// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @notice This is the MockUSD used in testnet
 *         Maximum mint amount is 500k for each user.
 *         Maximum mint amount for every single tx is 100k.
 */
contract MockUSD is ERC20 {
    uint256 public constant INITIAL_SUPPLY = 100000 * 1e6;

    constructor() ERC20("MOCKUSD", "USDC") {
        // When first deployed, give the owner some coins
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    // Everyone can mint, have fun for test
    function mint(address _account, uint256 _amount) public {
        _mint(_account, _amount);
    }

    // 6 decimals to mock stablecoins
    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
