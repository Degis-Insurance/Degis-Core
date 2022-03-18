// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "../utils/Ownable.sol";

/**
 * @title  Signature Manager
 * @notice Signature is used when submitting new applications.
 *         The premium should be decided by the pricing model and be signed by a private key.
 *         Other submissions will not be accepted.
 *         Please keep the signer key safe.
 */
contract SigManager is Ownable {
    using ECDSA for bytes32;

    // ---------------------------------------------------------------------------------------- //
    // ************************************** Variables *************************************** //
    // ---------------------------------------------------------------------------------------- //

    mapping(address => bool) public isValidSigner;

    bytes32 public _SUBMIT_APPLICATION_TYPEHASH;

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Events ***************************************** //
    // ---------------------------------------------------------------------------------------- //

    event SignerAdded(address _newSigner);
    event SignerRemoved(address _oldSigner);

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //

    constructor() Ownable(msg.sender) {
        _SUBMIT_APPLICATION_TYPEHASH = keccak256(
            "5G is great, physical lab is difficult to find"
        );
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************** Modifiers *************************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @dev This modifier uses assert which means this error should never happens
     */
    modifier validAddress(address _address) {
        assert(_address != address(0));
        _;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Set Functions ************************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Add a signer into valid signer list
     * @param _newSigner The new signer address
     */
    function addSigner(address _newSigner)
        external
        validAddress(_newSigner)
        onlyOwner
    {
        require(!isValidSigner[_newSigner], "Already a signer");

        isValidSigner[_newSigner] = true;

        emit SignerAdded(_newSigner);
    }

    /**
     * @notice Remove a signer from the valid signer list
     * @param _oldSigner The old signer address to be removed
     */
    function removeSigner(address _oldSigner)
        external
        validAddress(_oldSigner)
        onlyOwner
    {
        require(isValidSigner[_oldSigner], "Not a signer");

        isValidSigner[_oldSigner] = false;

        emit SignerRemoved(_oldSigner);
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Check signature when buying a new policy (avoid arbitrary premium amount)
     * @param signature 65 bytes array: [[v (1)], [r (32)], [s (32)]]
     * @param _flightNumber Flight number
     * @param _departureTimestamp Flight departure timestamp
     * @param _landingDate Flight landing date
     * @param _user User address
     * @param _premium Policy premium
     * @param _deadline Deadline of a this signature
     */
    function checkSignature(
        bytes calldata signature,
        string memory _flightNumber,
        uint256 _departureTimestamp,
        uint256 _landingDate,
        address _user,
        uint256 _premium,
        uint256 _deadline
    ) external view {
        bytes32 hashedFlightNumber = keccak256(bytes(_flightNumber));

        bytes32 hashData = keccak256(
            abi.encodePacked(
                _SUBMIT_APPLICATION_TYPEHASH,
                hashedFlightNumber,
                _departureTimestamp,
                _landingDate,
                _user,
                _premium,
                _deadline
            )
        );
        address signer = hashData.toEthSignedMessageHash().recover(signature);

        require(isValidSigner[signer], "Only submitted by authorized signers");
    }
}
