// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ILMToken is ERC20 {
    address public ILMContract;

    constructor(
        address _ILM,
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) {
        ILMContract = _ILM;
    }

    modifier onlyILM() {
        require(msg.sender == ILMContract, "Only ILM");
        _;
    }

    function mint(address _to, uint256 _amount) public onlyILM {
        _mint(_to, _amount);
    }

    function burn(address _to, uint256 _amount) public onlyILM {
        _burn(_to, _amount);
    }
}
