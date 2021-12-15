// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../utils/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";

import "./interfaces/IDegisLottery.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract RandomNumberGenerator is VRFConsumerBase, Ownable {
    using Strings for uint256;
    using SafeERC20 for IERC20;

    address public DegisLottery;
    bytes32 public keyHash;
    bytes32 public latestRequestId;
    uint32 public randomResult;
    uint256 public fee;
    uint256 public latestLotteryId;

    /**
     * @notice Constructor
     * @dev RandomNumberGenerator must be deployed before the lottery.
     * Once the lottery contract is deployed, setLotteryAddress must be called.
     * https://docs.chain.link/docs/vrf-contracts/
     * @param _vrfCoordinator: address of the VRF coordinator
     * @param _linkToken: address of the LINK token
     */
    constructor(
        address _vrfCoordinator,
        address _linkToken,
        bytes32 _keyHash
    ) VRFConsumerBase(_vrfCoordinator, _linkToken) {
        keyHash = _keyHash;
        fee = 0.1 * 10e18;
    }

    /**
     * @notice Request randomness from Chainlink VRF
     */
    function getRandomNumber() external override {
        require(msg.sender == DegisLottery, "Only DegisLottery");
        require(keyHash != bytes32(0), "Must have valid key hash");
        // require(LINK.balanceOf(address(this)) >= fee, "Not enough LINK tokens");

        //*********************************//
        // This part is only for test on Fuji Testnet because there is no VRF currently
        string memory randInput = string(
            abi.encodePacked((block.timestamp).toString(), address(this))
        );
        randomResult = uint32(10000 + (_rand(randInput) % 10000));
        //*********************************//

        // latestRequestId = requestRandomness(keyHash, fee);

        latestLotteryId = IDegisLottery(DegisLottery).viewCurrentLotteryId();
    }

    function _rand(string memory input) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(input)));
    }

    /**
     * @notice Change the fee
     * @param _fee: new fee (in LINK)
     */
    function setFee(uint256 _fee) external onlyOwner {
        fee = _fee;
    }

    /**
     * @notice Change the keyHash
     * @param _keyHash: new keyHash
     */
    function setKeyHash(bytes32 _keyHash) external onlyOwner {
        keyHash = _keyHash;
    }

    /**
     * @notice Set the address for the DegisLottery
     * @param _degisLottery: address of the PancakeSwap lottery
     */
    function setLotteryAddress(address _degisLottery) external onlyOwner {
        DegisLottery = _degisLottery;
    }

    /**
     * @notice It allows the admin to withdraw tokens sent to the contract
     * @param _tokenAddress: the address of the token to withdraw
     * @param _tokenAmount: the number of token amount to withdraw
     * @dev Only callable by owner.
     */
    function withdrawTokens(address _tokenAddress, uint256 _tokenAmount)
        external
        onlyOwner
    {
        IERC20(_tokenAddress).safeTransfer(address(msg.sender), _tokenAmount);
    }

    /**
     * @notice View latestLotteryId
     */
    function viewLatestLotteryId() external view override returns (uint256) {
        return latestLotteryId;
    }

    /**
     * @notice View random result
     */
    function viewRandomResult() external view override returns (uint32) {
        return randomResult;
    }

    /**
     * @notice Callback function used by ChainLink's VRF Coordinator
     */
    function fulfillRandomness(bytes32 requestId, uint256 randomness)
        internal
        override
    {
        require(latestRequestId == requestId, "Wrong requestId");
        randomResult = uint32(10000 + (randomness % 10000));
        latestLotteryId = IDegisLottery(DegisLottery).viewCurrentLotteryId();
    }
}
