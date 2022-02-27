// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

interface IInsurancePool {
    // view functions

    function getUserBalance(address) external view returns (uint256);

    function getPoolUnlocked() external view returns (uint256);

    function getUnlockedFor(address _user) external view returns (uint256);

    function getLockedFor(address _user) external view returns (uint256);

    function checkCapacity(uint256 _payoff) external view returns (bool);

    // set functions

    function setPurchaseIncentive(uint256 _newIncentive) external;

    function setFrozenTime(uint256 _newFrozenTime) external;

    function setPolicyFlow(address _policyFlowAddress) external;

    function setIncomeDistribution(uint256[3] memory _newDistribution) external;

    function setCollateralFactor(uint256 _factor) external;

    function transferOwnership(address _newOwner) external;

    // main functions

    function stake(address _user, uint256 _amount) external;

    function unstake(uint256 _amount) external;

    function unstakeMax() external;

    function updateWhenBuy(
        uint256 _premium,
        uint256 _payoff,
        address _user
    ) external;

    function updateWhenExpire(uint256 _premium, uint256 _payoff) external;

    function payClaim(
        uint256 _premium,
        uint256 _payoff,
        uint256 _realPayoff,
        address _user
    ) external;

    function revertUnstakeRequest(address _user) external;

    function revertAllUnstakeRequest(address _user) external;
}
