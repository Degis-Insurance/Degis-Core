This is the contract for the naughtyPrice swapping pair.
        Every time a new naughtyPrice product is online you need to deploy this contract.
        The contract will be initialized with two tokens and a deadline.
        Token0 will be policy tokens and token1 will be stablecoins.
        The swaps are only availale before the deadline.


## Functions
### initialize
```solidity
  function initialize(
    address _token0,
    address _token1,
    uint256 _deadline
  ) external
```
Initialize the contract status after the deployment by factory


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_token0` | address | Token0 address (policy token address)
|`_token1` | address | Token1 address (stablecoin address)
|`_deadline` | uint256 | Deadline for this pool

### getReserves
```solidity
  function getReserves(
  ) public returns (uint112 _reserve0, uint112 _reserve1)
```
Get reserve0 (Policy token) and reserve1 (stablecoin).

This function always put policy token at the first place!


#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`_reserve0`| uint112 | Reserve of token0
|`_reserve1`| uint112 | Reserve of token1
### mint
```solidity
  function mint(
    address to
  ) external returns (uint256 liquidity)
```
Mint LP Token to liquidity providers
        Called when adding liquidity.


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`to` | address | The user address

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`liquidity`| uint256 | The LP token amount
### burn
```solidity
  function burn(
    address _to
  ) external returns (uint256 amount0, uint256 amount1)
```
Burn LP tokens give back the original tokens


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_to` | address | User address

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`amount0`| uint256 | Amount of token0 to be sent back
|`amount1`| uint256 | Amount of token1 to be sent back
### swap
```solidity
  function swap(
    uint256 _amount0Out,
    uint256 _amount1Out,
    address _to
  ) external
```
Finish the swap process


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_amount0Out` | uint256 | Amount of token0 to be given out (may be 0)
|`_amount1Out` | uint256 | Amount of token1 to be given out (may be 0)
|`_to` | address | Address to receive the swap result

### sync
```solidity
  function sync(
  ) external
```
Syncrinize the status of this pool



### min
```solidity
  function min(
    uint256 x,
    uint256 y
  ) internal returns (uint256 z)
```
Get the smaller one of two numbers


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`x` | uint256 | The first number
|`y` | uint256 | The second number

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`z`| uint256 | The smaller one
## Events
### ReserveUpdated
```solidity
  event ReserveUpdated(
  )
```



### Swap
```solidity
  event Swap(
  )
```



### Mint
```solidity
  event Mint(
  )
```



### Burn
```solidity
  event Burn(
  )
```



