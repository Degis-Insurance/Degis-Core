// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title  LPToken
 * @notice This is the LP Token for flight delay insurance pool.
 *         When users deposit funds into the pool, they will get the LP Tokens.
 *         Imported into insurancePool and no need to deploy this file.
 */
contract LPToken is ERC20("Degis FlightDelay LPToken", "DLP") {
    function LPMint(address account, uint256 value) internal {
        _mint(account, value);
    }

    function LPBurn(address account, uint256 value) internal {
        _burn(account, value);
    }

    function LPBalanceOf(address _account) public view returns (uint256) {
        return balanceOf(_account);
    }
}
