// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

import "../utils/Ownable.sol";
import "../lucky-box/interfaces/IDegisLottery.sol";
import "../libraries/StringsUtils.sol";

contract VRFMock is Ownable {
    using StringsUtils for uint256;

    IDegisLottery public DegisLottery;

    uint256 public seed;

    uint256 public randomResult;

    uint256 public latestLotteryId;

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Set the address for the DegisLottery
     * @param _degisLottery address of the PancakeSwap lottery
     */
    function setLotteryAddress(address _degisLottery) external onlyOwner {
        DegisLottery = IDegisLottery(_degisLottery);
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Request randomness from Chainlink VRF
     */
    function getRandomNumber() external {
        require(
            _msgSender() == address(DegisLottery) || _msgSender() == owner(),
            "Only DegisLottery"
        );

        randomResult = (_rand(++seed) % 10000) + 10000;

        latestLotteryId = IDegisLottery(DegisLottery).currentLotteryId();
    }

    function _rand(uint256 _input) internal pure returns (uint256) {
        return _input * 12345;
    }
}
