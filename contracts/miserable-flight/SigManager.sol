// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "../utils/Ownable.sol";

/**
 * @title  Signature Manager
 * @notice Signature is used when submitting new applications.
 *         The premium should be decided by the pricing model and be signed by a private key.
 *         Other submission will not be accepted.
 *         Please keep the signer key safe.
 */
contract SigManager is Ownable {
    using ECDSA for bytes32;

    mapping(address => bool) public _isValidSigner;

    bytes32 public _SUBMIT_APPLICATION_TYPEHASH;

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Events ***************************************** //
    // ---------------------------------------------------------------------------------------- //

    event SignerAdded(address _newSigner);
    event SignerRemoved(address _oldSigner);

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //

    constructor() {
        _SUBMIT_APPLICATION_TYPEHASH = keccak256(
            "5G is great, physical lab is difficult to find"
        );
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************** Modifiers *************************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @dev This modifier uses assert which means this error should never happens.
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
        require(
            isValidSigner(_newSigner) == false,
            "this address is already a signer"
        );
        _isValidSigner[_newSigner] = true;
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
        require(
            isValidSigner(_oldSigner) == true,
            "this address is not a signer"
        );
        _isValidSigner[_oldSigner] = false;
        emit SignerRemoved(_oldSigner);
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ View Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Check whether the address is a valid signer
     * @param _address The input address
     * @return isValidSigner Whether this address is
     */
    function isValidSigner(address _address) public view returns (bool) {
        return _isValidSigner[_address];
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Check signature when buying a new policy (avoid arbitrary premium amount)
     * @param signature 65 bytes array: [[v (1)], [r (32)], [s (32)]]
     * @param _flightNumber Flight number
     * @param _userAddress User address
     * @param _premium Policy premium
     * @param _deadline Deadline of a policy
     */
    function checkSignature(
        bytes calldata signature,
        string memory _flightNumber,
        address _userAddress,
        uint256 _premium,
        uint256 _deadline
    ) external view {
        bytes32 hashedFlightNumber = keccak256(bytes(_flightNumber));
        bytes32 hashData = keccak256(
            abi.encodePacked(
                _SUBMIT_APPLICATION_TYPEHASH,
                hashedFlightNumber,
                _userAddress,
                _premium,
                _deadline
            )
        );
        address signer = hashData.toEthSignedMessageHash().recover(signature);
        require(
            _isValidSigner[signer],
            "Can only submitted by authorized signer"
        );
    }
}
