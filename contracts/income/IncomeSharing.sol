// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract IncomeSharing {
    using SafeERC20 for IERC20;

    IERC20 usd;
    IERC20 degis;

    struct UserInfo {
        uint256 shares;
        uint256 income;
    }
    mapping(address => UserInfo) public users;

    uint256 public currentRound;

    function deposit(uint256 _amount) public {
        degis.safeTransferFrom(msg.sender, address(this), _amount);
    }

    function redeem(uint256 _amount) public {}

    modifier hasPassedInterval() {
        _;
    }

    function distribute() external hasPassedInterval {
        ++currentRound;
    }

    /**
     * @notice Claim the user's income
     */
    function claim() external {
        require(users[msg.sender].income > 0);

        uint256 pendingIncome;

        usd.safeTransfer(msg.sender, pendingIncome);

        users[msg.sender].income = 0;
    }
}
