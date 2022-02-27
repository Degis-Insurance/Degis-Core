// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

interface IDegisLottery {
    /**
     * @notice Inject funds
     * @param _amount amount to inject in USD
     * @dev Callable by operator
     */
    function injectFunds(uint256 _amount) external;

    /**
     * @notice View current lottery id
     */
    function currentLotteryId() external view returns (uint256);
}
