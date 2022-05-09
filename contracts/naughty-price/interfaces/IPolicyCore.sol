// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

interface IPolicyCore {
    struct PolicyTokenInfo {
        address policyTokenAddress;
        bool isCall;
        uint256 nameDecimals; // decimals of the name generation
        uint256 tokenDecimals; // decimals of the policy token
        uint256 strikePrice;
        uint256 deadline;
        uint256 settleTimestamp;
    }

    /**
     * @notice Find the address by its name
     */
    function findAddressbyName(string memory _policyTokenName)
        external
        view
        returns (address _policyTokenAddress);

    /**
     * @notice Find the name by address
     */
    function findNamebyAddress(address _policyTokenAddress)
        external
        view
        returns (string memory);

    /**
     * @notice Check whether the stablecoin is supported
     */
    function supportedStablecoin(address _coinAddress)
        external
        view
        returns (bool);

    function delegateDeposit(
        string memory _policyTokenName,
        address _stablecoin,
        uint256 _amount,
        address _user
    ) external;

    function deployPool(
        string memory _policyTokenName,
        address _stablecoin,
        uint256 _poolDeadline,
        uint256 _feeRate
    ) external returns (address);

    function getPolicyTokenInfo(string memory _policyTokenName)
        external
        view
        returns (PolicyTokenInfo memory);

    function updateUserQuota(
        address _user,
        address _policyToken,
        uint256 _amount
    ) external;
}
