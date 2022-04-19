// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "./IVeERC20.sol";

/**
 * @dev Interface of the VePtp
 */
interface IVeDEG is IVeERC20 {
    function isUser(address _addr) external view returns (bool);

    function deposit(uint256 _amount) external;

    function claim() external;

    function withdraw(uint256 _amount) external;

    function getStakedPtp(address _addr) external view returns (uint256);

    function getVotes(address _account) external view returns (uint256);

    function lockVeDEG(address _to, uint256 _amount) external;

    function unlockVeDEG(address _to, uint256 _amount) external;
}
