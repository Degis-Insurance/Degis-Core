// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {IVeDEG} from "../governance/interfaces/IVeDEG.sol";

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title Shield Token (Derived Stablecoin on Degis)
 */
contract Shield is ERC20Upgradeable, OwnableUpgradeable {
    IVeDEG veDEG;
    mapping(address => bool) supportedStablecoin;
    mapping(address => uint256) depositRatio;

    function initialize() public initializer {
        __ERC20_init("Shield Token", "SHD");
        __Ownable_init();
    }

    function addSupportedStablecoin(address _stablecoin, uint256 _ratio)
        external
        onlyOwner
    {
        require(_ratio >= 100, "Deposit ratio must be greater than 100");
        supportedStablecoin[_stablecoin] = true;
        depositRatio[_stablecoin] = _ratio;
    }

    function _getDiscount() internal {}

    function _swap() internal {}

    function deposit(address _stablecoin, uint256 _amount) external {}
}
