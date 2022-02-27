// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

import "../utils/ERC20PermitWithMultipleMinters.sol";

/**
 * @title  Buyer Token
 * @notice Buyer tokens are distributed to buyers corresponding to the usd value they spend.
 *         Users can deposit their buyer tokens into PurchaseIncentiveVault.
 *         Periodical reward will be given to the participants in PurchaseIncentiveVault.
 *         When distributing purchase incentive reward, the buyer tokens will be burned.
 * @dev    Need to set the correct minters and burners when reploying this contract.
 */
contract BuyerToken is ERC20PermitWithMultipleMinters {
    // ---------------------------------------------------------------------------------------- //
    // ************************************ Constructor *************************************** //
    // ---------------------------------------------------------------------------------------- //

    constructor() ERC20PermitWithMultipleMinters("DegisBuyerToken", "DBT") {}

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Main Functions ************************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Mint buyer tokens
     * @param  _account Receiver's address
     * @param  _amount Amount to be minted
     */
    function mintBuyerToken(address _account, uint256 _amount) external {
        mint(_account, _amount);
    }

    /**
     * @notice Burn buyer tokens
     * @param  _account Receiver's address
     * @param  _amount Amount to be burned
     */
    function burnBuyerToken(address _account, uint256 _amount) external {
        burn(_account, _amount);
    }
}
