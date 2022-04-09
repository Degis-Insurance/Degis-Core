// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./utils/Ownable.sol";

/**
 * @title  Emergency Pool
 * @notice Emergency pool in degis will keep a reserve vault for emergency usage.
 *         The asset comes from part of the product's income (currently 10%).
 *         Users can also stake funds into this contract manually.
 *         The owner has the right to withdraw funds from emergency pool and it would be passed to community governance.
 */
contract EmergencyPool is Ownable {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Variables **************************************** //
    // ---------------------------------------------------------------------------------------- //

    string public name = "Degis Emergency Pool";

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Events ***************************************** //
    // ---------------------------------------------------------------------------------------- //

    event Deposit(
        address indexed tokenAddress,
        address indexed userAddress,
        uint256 amount
    );
    event Withdraw(
        address indexed tokenAddress,
        address indexed userAddress,
        uint256 amount
    );
    event UseFund(
        address indexed tokenAddress,
        address indexed userAddress,
        uint256 amount
    );

    constructor() Ownable(msg.sender) {}

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Manually stake into the pool
     * @param _tokenAddress Address of the ERC20 token
     * @param _amount The amount that the user want to stake
     */
    function deposit(address _tokenAddress, uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");

        IERC20(_tokenAddress).safeTransferFrom(
            _msgSender(),
            address(this),
            _amount
        );

        emit Deposit(_tokenAddress, _msgSender(), _amount);
    }

    /**
     * @notice Withdraw the asset when emergency (only by the owner)
     * @dev The ownership need to be transferred to another contract in the future
     * @param _tokenAddress Address of the ERC20 token
     * @param _amount The amount that the user want to unstake
     */
    function emergencyWithdraw(address _tokenAddress, uint256 _amount)
        external
        onlyOwner
    {
        uint256 balance = IERC20(_tokenAddress).balanceOf(address(this));
        require(_amount <= balance, "Insufficient funds");

        IERC20(_tokenAddress).safeTransfer(owner(), _amount);
        emit Withdraw(_tokenAddress, owner(), _amount);
    }

    /**
     * @notice Use emergency pool fund
     * @param _tokenAddress Address of the ERC20 token
     * @param _receiver Address of the receiver
     * @param _amount The amount to use    
     */
    function useFund(
        address _tokenAddress,
        address _receiver,
        uint256 _amount
    ) external onlyOwner {
        uint256 balance = IERC20(_tokenAddress).balanceOf(address(this));
        require(_amount <= balance, "Insufficient funds");

        IERC20(_tokenAddress).safeTransfer(_receiver, _amount);
        emit UseFund(_tokenAddress, _receiver, _amount);
    }
}
