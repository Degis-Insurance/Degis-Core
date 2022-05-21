// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

// import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// /**
//  * @notice This is the MockUSD used in testnet
//  *         Maximum mint amount is 500k for each user.
//  *         Maximum mint amount for every single tx is 100k.
//  */
// contract MockUSD is ERC20 {
//     uint256 public constant INITIAL_SUPPLY = 10000000 * 1e6;

//     mapping(address => bool) public minted;

//     address public owner;
//     address public degis;

//     uint256 public constant TEST_AMOUNT = 100000 * 1e6;

//     constructor(address _degis) ERC20("MOCKUSD", "USDC") {
//         // When first deployed, give the owner some coins
//         _mint(msg.sender, INITIAL_SUPPLY);
//         owner = msg.sender;
//         degis = _degis;
//     }

//     // Everyone can mint, have fun for test
//     function mint(address _account) public {
//         require(minted[_account] == false, "Already minted");
//         minted[_account] = true;

//         _mint(_account, TEST_AMOUNT);
//         IERC20(degis).transferFrom(owner, _account, TEST_AMOUNT * 1e10);
//     }

//     // function mint(address _account) public {
//     //     require(minted[_account] == false, "Already minted");
//     //     minted[_account] = true;

//     //     _mint(_account, TEST_AMOUNT);
//     //     IERC20(degis).transferFrom(owner, _account, TEST_AMOUNT * 1e10);
//     // }

//     // 6 decimals to mock stablecoins
//     function decimals() public pure override returns (uint8) {
//         return 6;
//     }
// }
