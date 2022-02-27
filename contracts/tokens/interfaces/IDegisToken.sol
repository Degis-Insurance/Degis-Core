// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/extensions/draft-IERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IDegisToken is IERC20, IERC20Permit {
    // ---------------------------------------------------------------------------------------- //
    // *************************************** Functions ************************************** //
    // ---------------------------------------------------------------------------------------- //
    function CAP() external view returns (uint256);

    /**
     * @notice Mint degis tokens
     * @param  _account Receiver's address
     * @param  _amount Amount to be minted
     */
    function mintDegis(address _account, uint256 _amount) external;

    /**
     * @notice Burn degis tokens
     * @param  _account Receiver's address
     * @param  _amount Amount to be burned
     */
    function burnDegis(address _account, uint256 _amount) external;
}
