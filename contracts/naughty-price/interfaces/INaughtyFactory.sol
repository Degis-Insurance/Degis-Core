// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

interface INaughtyFactory {
    function getPairAddress(address _tokenAddress1, address _tokenAddress2)
        external
        view
        returns (address);

    function deployPolicyToken(
        string memory _policyTokenName,
        uint256 _decimals
    ) external returns (address);

    function deployPool(
        address _policyTokenAddress,
        address _stablecoin,
        uint256 _deadline,
        uint256 _feeRate
    ) external returns (address);

    function incomeMaker() external view returns (address);

    function incomeMakerProportion() external view returns (uint256);
}
