// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../utils/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract DegisLottery {
    using SafeERC20 for IERC20;

    address public injectorAddress;

    uint256 public currentLotteryId;
}
