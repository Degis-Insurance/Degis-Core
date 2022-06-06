// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.13;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

contract RandomNumberGeneratorV2 is VRFConsumerBaseV2 {
    VRFCoordinatorV2Interface coordinator;

    uint64 subscriptionId;

    // Different networks and gas prices have different keyHash
    bytes32 public keyHash;

    // Gas limit for callback
    uint32 callbackGasLimit = 100000;

    // Confirmations for each request
    uint16 requestConfirmations = 3;

    // Request 1 random number each time
    uint32 public wordsPerTime = 1;

    // Store the latest result
    uint256[] public s_randomWords;

    // Store the latest request id
    uint256 public s_requestId;

    // Owner address
    address public owner;

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Events ***************************************** //
    // ---------------------------------------------------------------------------------------- //

    event RequestRandomWords(uint256 requestId);

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //

    constructor(
        address _vrfCoordinator,
        bytes32 _keyHash,
        uint64 _subscriptionId
    ) VRFConsumerBaseV2(_vrfCoordinator) {
        // Set coordinator address depends on networks
        coordinator = VRFCoordinatorV2Interface(_vrfCoordinator);

        // Set keyhash depends on networks and gas price
        keyHash = _keyHash;

        // Subscription id depends on networks
        subscriptionId = _subscriptionId;

        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Set Functions ************************************* //
    // ---------------------------------------------------------------------------------------- //

    function setKeyHash(bytes32 _keyHash) external onlyOwner {
        keyHash = _keyHash;
    }

    function setSubscriptionId(uint64 _subscriptionId) external onlyOwner {
        subscriptionId = _subscriptionId;
    }

    function setCoordinator(address _coordinator) external onlyOwner {
        coordinator = VRFCoordinatorV2Interface(_coordinator);
    }

    function setWordsPerTime(uint32 _wordsPerTime) external onlyOwner {
        wordsPerTime = _wordsPerTime;
    }

    function setRequestConfirmations(uint16 _requestConfirmations)
        external
        onlyOwner
    {
        requestConfirmations = _requestConfirmations;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    function requestRandomWords() external onlyOwner {
        s_requestId = coordinator.requestRandomWords(
            keyHash,
            subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            wordsPerTime
        );

        emit RequestRandomWords(s_requestId);
    }

    function fulfillRandomWords(uint256, uint256[] memory _randomWords)
        internal
        override
    {
        s_randomWords = _randomWords;
    }
}
