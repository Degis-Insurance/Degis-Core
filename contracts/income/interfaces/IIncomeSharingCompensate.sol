// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.13;

interface IIncomeSharingCompensate {
    function compensate(address _to, uint256 _amount) external;
}
