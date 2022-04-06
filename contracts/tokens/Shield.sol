// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title Shield Token (Derived Stablecoin on Degis)
 */
contract Shield is ERC20 {
    constructor() ERC20("Degis Shield Token", "SHD") {}




    function deposit(address _stablecoin, uint256 _amount) external {
        
    }
}
