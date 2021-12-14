// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../libraries/SafePRBMath.sol";

import "../tokens/interfaces/IDegisToken.sol";
import "../lucky-box/interfaces/IDegisLottery.sol";

import "../utils/OwnableWithoutContext.sol";

import "./abstracts/InsurancePoolStore.sol";

/**
 * @title  Insurance Pool
 * @notice Insurance pool is the reserved risk pool for flight delay product.
 *         For simplicity, some state variables are in the InsurancePoolStore contract.
 */

contract InsurancePool is ERC20, InsurancePoolStore, OwnableWithoutContext {
    using SafeERC20 for IERC20;
    using SafePRBMath for uint256;

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Other Contracts ************************************ //
    // ---------------------------------------------------------------------------------------- //

    IDegisToken public degis;
    IERC20 public USDT;
    IDegisLottery public degisLottery;

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Constructor function
     * @param _degisToken Degis token address
     * @param _emergencyPool Emergency pool address
     * @param _degisLottery Lottery address
     * @param _usdtAddress USDT address
     */
    constructor(
        address _degisToken,
        address _emergencyPool,
        address _degisLottery,
        address _usdtAddress
    ) ERC20("Degis FlightDelay LPToken", "DLP") {
        // Initialize some factors
        collateralFactor = 1e18;
        lockedRatio = 1e18;
        LPValue = 1e18;

        emergencyPool = _emergencyPool;

        degis = IDegisToken(_degisToken);
        USDT = IERC20(_usdtAddress);

        degisLottery = IDegisLottery(_degisLottery);

        // Initial distribution, 0: LP 1: Lottery 2: Emergency
        rewardDistribution[0] = 50;
        rewardDistribution[1] = 40;
        rewardDistribution[2] = 10;
    }
}
