// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IBuyerToken is IERC20 {
    // ---------------------------------------------------------------------------------------- //
    // *************************************** Functions ************************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Mint buyer tokens
     * @param  _account Receiver's address
     * @param  _amount Amount to be minted
     */
    function mintBuyerToken(address _account, uint256 _amount) external;

    /**
     * @notice Burn buyer tokens
     * @param  _account Receiver's address
     * @param  _amount Amount to be burned
     */
    function burnBuyerToken(address _account, uint256 _amount) external;
}
