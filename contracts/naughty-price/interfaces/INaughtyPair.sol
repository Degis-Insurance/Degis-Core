// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface INaughtyPair is IERC20 {
    event ReserveUpdated(uint256 reserve0, uint256 reserve1);
    event Swap(
        address indexed sender,
        uint256 amountAIn,
        uint256 amountBIn,
        uint256 amountAOut,
        uint256 amountBOut,
        address indexed to
    );

    event Mint(address indexed sender, uint256 amountA, uint256 amountB);
    event Burn(
        address indexed sender,
        uint256 amountA,
        uint256 amountB,
        address indexed to
    );

    function factory() external view returns (address);

    function token0() external view returns (address);

    function token1() external view returns (address);

    function deadline() external view returns (uint256);

    function getReserves()
        external
        view
        returns (uint112 _reserve0, uint112 _reserve1);

    function swap(
        uint256,
        uint256,
        address
    ) external;

    function burn(address) external returns (uint256, uint256);

    function mint(address) external returns (uint256);

    function sync() external;

    function initialize(
        address _token0,
        address _token1,
        uint256 _deadline
    ) external;
}
