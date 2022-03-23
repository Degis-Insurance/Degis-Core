// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Degis Income Sharing Contract
 * @notice This contract will receive part of the income from Degis products
 *         And the income will be shared by DEG holders
 *         The share will be distributed every week
 */
contract IncomeSharing {
    using SafeERC20 for IERC20;

    string public constant name = "Degis Income Sharing Contract";

    IERC20 usd;
    IERC20 degis;

    struct UserInfo {
        uint256 balance;
        uint256 rewardDebt;
    }
    mapping(address => UserInfo) public users;

    struct RoundInfo {
        uint256 totalShares;
        uint256 totalWeight;
        uint256 startTimestamp;
        uint256 endTimestamp;
    }
    mapping(uint256 => RoundInfo) public rounds;

    uint256 public currentRound;

    function getRoundInfo(uint256 _round)
        external
        view
        returns (RoundInfo memory)
    {
        return rounds[_round];
    }

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
        uint256 pendingIncome;

        usd.safeTransfer(msg.sender, pendingIncome);
    }
}
