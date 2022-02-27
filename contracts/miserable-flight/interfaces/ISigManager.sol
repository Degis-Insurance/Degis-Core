// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

interface ISigManager {
    event SignerAdded(address indexed _newSigner);
    event SignerRemoved(address indexed _oldSigner);

    function addSigner(address) external;

    function removeSigner(address) external;

    function isValidSigner(address) external view returns (bool);

    function checkSignature(
        bytes calldata signature,
        string memory _flightNumber,
        uint256 _departureTimestamp,
        uint256 _landingDate,
        address _address,
        uint256 _premium,
        uint256 _deadline
    ) external view;
}
