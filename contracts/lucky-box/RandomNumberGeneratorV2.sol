// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.13;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "./interfaces/IDegisLottery.sol";

contract RandomNumberGeneratorV2 is VRFConsumerBaseV2 {
    // Coordinator address based on networks
    // Fuji: 0x2eD832Ba664535e5886b75D64C46EB9a228C2610
    // Mainnet: 0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634
    VRFCoordinatorV2Interface public coordinator;

    // Subscription id, created on chainlink website
    // Fuji: 130
    // Mainnet: 28 (test)
    uint64 public subscriptionId;

    // Different networks and gas prices have different keyHash
    // Fuji: 300gwei 0x354d2f95da55398f44b7cff77da56283d9c6c829a4bdf1bbcaf2ad6a4d081f61
    // Mainnet: 500gwei 0x89630569c9567e43c4fe7b1633258df9f2531b62f2352fa721cf3162ee4ecb46
    bytes32 public keyHash;

    // Gas limit for callback
    uint32 public callbackGasLimit = 100000;

    // Confirmations for each request
    uint16 public requestConfirmations = 3;

    // Request 1 random number each time
    uint32 public wordsPerTime = 1;

    // Store the latest result
    uint256 public randomResult;

    // Store the latest request id
    uint256 public s_requestId;

    // Owner address
    address public owner;

    // Latest lottery id
    uint256 public latestLotteryId;

    address public degisLottery;

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
        require(
            msg.sender == owner || msg.sender == degisLottery,
            "Only owner or lottery"
        );
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

    function setDegisLottery(address _lottery) external onlyOwner {
        degisLottery = _lottery;
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
        randomResult = (_randomWords[0] % 10000) + 10000;

        // Update latest lottery id
        // Before this update, lottery can not make that round claimable
        latestLotteryId = IDegisLottery(degisLottery).currentLotteryId();
    }
}
