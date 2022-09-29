// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ILMToken is ERC20 {
    address public ILMContract;

    constructor(
        address _ILM,
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) {
        ILMContract = _ILM;
    }

    /**
     * @notice Only ILM contract
     */
    modifier onlyILM() {
        require(msg.sender == ILMContract, "Only ILM");
        _;
    }

    /**
     * @notice Mint new tokens
     *
     * @param _to       The address that will receive the minted tokens
     * @param _amount   The amount of tokens to mint
     */
    function mint(address _to, uint256 _amount) public onlyILM {
        _mint(_to, _amount);
    }

    /**
     * @notice Burn tokens
     *
     * @param _to       The address that will have its tokens burned
     * @param _amount   The amount of tokens to burn
     */
    function burn(address _to, uint256 _amount) public onlyILM {
        _burn(_to, _amount);
    }
}
