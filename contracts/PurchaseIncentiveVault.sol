// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title  Purchase Incentive Vault
 * @notice This is the purchase incentive vault for staking buyer tokens.
 *         Users first stake their buyer tokens and wait for distribution.
 *         About every 24 hours, the reward will be calculated to users' account.
 *         After disrtribution, users' reward balance will update but they still need to manually claim the reward.
 */
contract PurchaseInventiveVault {
    using SafeERC20 for IERC20;

    IERC20 BuyerToken;
}
