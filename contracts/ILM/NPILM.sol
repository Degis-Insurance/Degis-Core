// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract NaughtyPriceILM {
    mapping(address => uint256[2]) userDeposit;

    uint256 public amountA;
    uint256 public amountB;

    uint256 deadline;

    modifier duringILM() {
        _;
    }

    function initialize(uint256 _deadline) public {
        deadline = _deadline;
    }

    function getUserDeposit(address _user)
        public
        view
        returns (uint256[2] memory)
    {}

    function deposit(uint256 _amountA, uint256 _amountB) public {}

    function withdraw(uint256 _amountA, uint256 _amountB) public duringILM {}
}
