// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
}

contract IncomeCompensate {
    address public constant incomeSharingVault =
        0x7a5c17292AFfb5cFFd34991058e44C81C856f10b;

    address public constant USDCe = 0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664;

    function compensate(address _user, uint256 _amount) external {
        require(msg.sender == incomeSharingVault, "Only vault");

        IERC20(USDCe).transfer(_user, _amount);
    }
}
