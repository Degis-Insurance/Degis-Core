// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface INaughtyFactory {
    function getPairAddress(address _tokenAddress1, address _tokenAddress2)
        external
        view
        returns (address);

    function deployPolicyToken(string memory _policyTokenName)
        external
        returns (address);

    function deployPool(
        address _policyTokenAddress,
        address _stablecoin,
        uint256 _deadline
    ) external returns (address);
}
