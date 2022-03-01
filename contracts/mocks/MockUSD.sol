// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @notice This is the MockUSD used in testnet
 *         Maximum mint amount is 500k for each user.
 *         Maximum mint amount for every single tx is 100k.
 */
contract MockUSD is ERC20 {
    uint256 public constant INITIAL_SUPPLY = 100000 ether;

    uint256 public USER_CAP = 500000 ether;

    mapping(address => uint256) userHaveMinted;
    address[] allUsers;

    constructor() ERC20("MOCKUSD", "USDC") {
        // When first deployed, give the owner some coins
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    // For testnet check
    function getAllUsers() external view returns (address[] memory) {
        return allUsers;
    }

    // Everyone can mint, have fun for test
    function mint(address _account, uint256 _amount) public {
        require(_amount <= 100000e18, "Please mint less than 100k every time");
        require(
            userHaveMinted[_account] + _amount <= USER_CAP,
            "You have minted too many usd (maximum 500k)"
        );

        if (userHaveMinted[_account] == 0) allUsers.push(_account);

        _mint(_account, _amount);
        userHaveMinted[_account] += _amount;
    }

    // 6 decimals to mock stablecoins
    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
