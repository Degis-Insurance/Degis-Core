// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

interface IPolicyCore {
    struct PolicyTokenInfo {
        address policyTokenAddress;
        bool isCall;
        uint256 strikePrice;
        uint256 deadline;
        uint256 settleTimestamp;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Functions ***************************************** //
    // ---------------------------------------------------------------------------------------- //

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
     * @notice Get the policy token information
     */
    function getPolicyTokenInfo(string memory _policyTokenName)
        external
        view
        returns (PolicyTokenInfo memory);

    function getAllTokens() external view returns (PolicyTokenInfo[] memory);

    function checkUserQuota(address _user, address _policyTokenAddress)
        external
        view
        returns (uint256 _quota);

    function supportedStablecoin(address _coinAddress)
        external
        view
        returns (bool);

    function addStablecoin(address _newStablecoin) external;

    function setLottery(address _lotteryAddress) external;

    function setEmergencyPool(address _emergencyPool) external;

    function deployPolicyToken(
        string memory _policyTokenName,
        bool _isHigher,
        uint256 _strikePrice,
        uint256 _deadline,
        uint256 _round,
        uint256 _settleTimestamp
    ) external returns (address);

    function deployPool(
        string memory _policyTokenName,
        address _stablecoin,
        uint256 _poolDeadline
    ) external returns (address);

    function deposit(
        string memory _policyTokenName,
        address _stablecoin,
        uint256 _amount
    ) external;

    function delegateDeposit(
        string memory _policyTokenName,
        address _stablecoin,
        uint256 _amount,
        address _user
    ) external;

    function redeem(
        string memory _policyTokenName,
        address _stablecoin,
        uint256 _amount
    ) external;

    function claim(
        string memory _policyTokenName,
        address _stablecoin,
        uint256 _amount
    ) external;
}
