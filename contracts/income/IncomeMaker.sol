// SPDX-License-Identifier: GPL-3.0-or-Later

pragma solidity ^0.8.10;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../naughty-price/interfaces/INaughtyRouter.sol";
import "../naughty-price/interfaces/INaughtyFactory.sol";
import "../naughty-price/interfaces/INaughtyPair.sol";

/**
 * @title Degis Maker Contract
 * @dev This contract will receive the transaction fee from swap pool
 *      Then it will transfer
 */
contract IncomeMaker is OwnableUpgradeable {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constants **************************************** //
    // ---------------------------------------------------------------------------------------- //

    uint256 public constant UINT256_MAX = type(uint256).max;

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Variables **************************************** //
    // ---------------------------------------------------------------------------------------- //

    INaughtyRouter public router;

    INaughtyFactory public factory;

    address public incomeSharingVault;

    uint256 public PRICE_SCALE = 1e6;

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Events ***************************************** //
    // ---------------------------------------------------------------------------------------- //

    event IncomeToUSD(
        address policyTokenAddress,
        address stablecoin,
        uint256 amountOut
    );
    event ConvertIncome(
        address caller,
        address policyTokenAddress,
        address stablecoin,
        uint256 policyTokenAmount, // Amount of policy token by burning lp tokens
        uint256 stablecoinAmount, // Amount of stablecoin by burning lp tokens
        uint256 stablecoinBackAmount // Amount of stablecoin by swapping policy tokens
    );
    event EmergencyWithdraw(address token, uint256 amount);

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Initialize function
     * @param _router Address of the naughty router
     * @param _factory Address of the naughty factory
     * @param _vault Address of the income sharing vault
     */
    function initialize(
        address _router,
        address _factory,
        address _vault
    ) public initializer {
        __Ownable_init();

        router = INaughtyRouter(_router);
        factory = INaughtyFactory(_factory);

        incomeSharingVault = _vault;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Convert the income to stablecoin and transfer to the incomeSharingVault
     * @param _policyToken Address of the policy token
     * @param _stablecoin Address of the stablecoi
     */
    function convertIncome(address _policyToken, address _stablecoin) external {
        // Get the pair
        INaughtyPair pair = INaughtyPair(
            factory.getPairAddress(_policyToken, _stablecoin)
        );
        require(address(pair) != address(0), "Pair not exist");

        // Transfer lp token to the pool and get two tokens
        IERC20(address(pair)).safeTransfer(
            address(pair),
            pair.balanceOf(address(this))
        );

        // Directly call the pair to burn lp tokens
        (uint256 amount0, uint256 amount1) = pair.burn(address(this));

        // Finish swap
        uint256 amountOut = _swap(
            _policyToken,
            _stablecoin,
            amount0,
            address(this)
        );

        // Transfer all stablecoins to income sharing vault
        IERC20(_stablecoin).safeTransfer(
            incomeSharingVault,
            IERC20(_stablecoin).balanceOf(address(this))
        );

        emit ConvertIncome(
            msg.sender,
            _policyToken,
            _stablecoin,
            amount0,
            amount1,
            amountOut
        );
    }

    /**
     * @notice Emergency withdraw by the owner
     * @param _token Address of the token
     * @param _amount Amount of the token
     */
    function emergencyWithdraw(address _token, uint256 _amount)
        external
        onlyOwner
    {
        IERC20(_token).safeTransfer(msg.sender, _amount);
        emit EmergencyWithdraw(_token, _amount);
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Internal Functions ********************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Swap policy tokens to stablecoins
     * @param _policyToken Address of policy token
     * @param _stablecoin Address of stablecoin
     * @param _amount Amount of policy token
     * @param _to Address of the receiver
     */
    function _swap(
        address _policyToken,
        address _stablecoin,
        uint256 _amount,
        address _to
    ) internal returns (uint256 amountOut) {
        // Get the pair
        INaughtyPair pair = INaughtyPair(
            factory.getPairAddress(_policyToken, _stablecoin)
        );
        require(address(pair) != address(0), "Pair not exist");

        (uint256 reserve0, uint256 reserve1) = pair.getReserves();

        uint256 feeRate = pair.feeRate();

        // Calculate amountIn - fee
        uint256 amountInWithFee = _amount * (1000 - feeRate);

        // Calculate amountOut
        amountOut =
            (amountInWithFee * reserve1) /
            (reserve0 * 1000 + amountInWithFee);

        // Transfer policy token and swap
        IERC20(_policyToken).safeTransfer(address(pair), _amount);
        pair.swap(0, amountOut, _to);
    }
}
