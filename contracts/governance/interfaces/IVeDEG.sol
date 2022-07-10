// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "./IVeERC20.sol";

/**
 * @dev Interface of the VeDEG
 */
interface IVeDEG is IVeERC20 {
    function deposit(uint256 _amount) external;

    function depositMaxTime(uint256 _amount) external;

    function claim() external;

    function withdraw(uint256 _amount) external;

    function lockVeDEG(address _to, uint256 _amount) external;

    function unlockVeDEG(address _to, uint256 _amount) external;
}
