// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

import "./interfaces/IDegisToken.sol";
import "../utils/ERC20PermitWithMultipleMinters.sol";

/**@title  Degis Token
 * @notice DegisToken inherits from ERC20 Permit which contains the basic ERC20 implementation.
 *         DegisToken can use the permit function rather than approve + transferFrom.
 *
 *         DegisToken has an owner, a minterList and a burnerList.
 *         When lauched on mainnet, the owner may be removed or tranferred to a multisig.
 *         By default, the owner & the first minter will be the one that deploys the contract.
 *         The minterList should contain FarmingPool and PurchaseIncentiveVault.
 *         The burnerList should contain EmergencyPool.
 */
contract DegisToken is ERC20PermitWithMultipleMinters {
    // Degis has a total supply of 100 million
    uint256 public constant CAP = 1e8 ether;

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Constructor *************************************** //
    // ---------------------------------------------------------------------------------------- //

    constructor() ERC20PermitWithMultipleMinters("DegisToken", "DEG") {}

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Modifiers **************************************** //
    // ---------------------------------------------------------------------------------------- //

    // Degis token has a hard cap of 100 million
    modifier notExceedCap(uint256 _amount) {
        require(
            totalSupply() + _amount <= CAP,
            "Exceeds the DEG cap (100 million)"
        );
        _;
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Main Functions ************************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Mint degis tokens
     * @param  _account Receiver's address
     * @param  _amount Amount to be minted
     */
    function mintDegis(address _account, uint256 _amount)
        external
        notExceedCap(_amount)
    {
        mint(_account, _amount);
    }

    /**
     * @notice Burn degis tokens
     * @param  _account Receiver's address
     * @param  _amount Amount to be burned
     */
    function burnDegis(address _account, uint256 _amount) external {
        burn(_account, _amount);
    }
}
