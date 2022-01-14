Router for the pool, you can add/remove liquidity or swap A for B.
        Swapping fee rate is 2% and all of them are given to LP.
        Very similar logic with Uniswap V2.



## Functions
### constructor
```solidity
  function constructor(
  ) public
```




### setPolicyCore
```solidity
  function setPolicyCore(
    address _coreAddress
  ) external
```
Set the address of policyCore


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_coreAddress` | address | Address of new policyCore

### setBuyerToken
```solidity
  function setBuyerToken(
    address _buyerToken
  ) external
```
Set the address of buyer token


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_buyerToken` | address | Address of new buyer token

### addLiquidityWithUSD
```solidity
  function addLiquidityWithUSD(
    address _tokenA,
    address _tokenB,
    uint256 _amountUSD,
    address _to,
    uint256 _minRatio,
    uint256 _deadline
  ) external
```
Add liquidity but only provide stablecoins


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_tokenA` | address | Address of policyToken
|`_tokenB` | address | Address of stablecoin
|`_amountUSD` | uint256 | Amount of stablecoins provided
|`_to` | address | Address that receive the lp token, normally the user himself
|`_minRatio` | uint256 | Minimum ratio (divided by 100)(amountMin / amountDesired)
|`_deadline` | uint256 | Transaction will revert after this deadline

### addLiquidity
```solidity
  function addLiquidity(
    address _tokenA,
    address _tokenB,
    uint256 _amountADesired,
    uint256 _amountBDesired,
    uint256 _amountAMin,
    uint256 _amountBMin,
    address _to,
    uint256 _deadline
  ) public returns (uint256 amountA, uint256 amountB, uint256 liquidity)
```
Add liquidity function


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_tokenA` | address | Address of policyToken
|`_tokenB` | address | Address of stablecoin
|`_amountADesired` | uint256 | Amount of policyToken desired
|`_amountBDesired` | uint256 | Amount of stablecoin desired
|`_amountAMin` | uint256 | Minimum amoutn of policy token
|`_amountBMin` | uint256 | Minimum amount of stablecoin
|`_to` | address | Address that receive the lp token, normally the user himself
|`_deadline` | uint256 | Transaction will revert after this deadline

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`amountA`| uint256 | Amount of tokenA to be input
|`amountB`| uint256 | Amount of tokenB to be input
|`liquidity`| uint256 | LP token to be mint
### removeLiquidity
```solidity
  function removeLiquidity(
    address _tokenA,
    address _tokenB,
    uint256 _liquidity,
    uint256 _amountAMin,
    uint256 _amountBMin,
    address _to,
    uint256 _deadline
  ) public returns (uint256 amountA, uint256 amountB)
```
Remove liquidity from the pool


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_tokenA` | address | Address of policy token
|`_tokenB` | address | Address of stablecoin
|`_liquidity` | uint256 | The lptoken amount to be removed
|`_amountAMin` | uint256 | Minimum amount of tokenA given out
|`_amountBMin` | uint256 | Minimum amount of tokenB given out
|`_to` | address | User address
|`_deadline` | uint256 | Deadline of this transaction

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`amountA`| uint256 | Amount of token0 given out
|`amountB`| uint256 | Amount of token1 given out
### swapTokensforExactTokens
```solidity
  function swapTokensforExactTokens(
    uint256 _amountInMax,
    uint256 _amountOut,
    address _tokenIn,
    address _tokenOut,
    address _to,
    uint256 _deadline
  ) external returns (uint256 amountIn)
```
Amount out is fixed


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_amountInMax` | uint256 | Maximum token input
|`_amountOut` | uint256 | Fixed token output
|`_tokenIn` | address | Address of input token
|`_tokenOut` | address | Address of output token
|`_to` | address | User address
|`_deadline` | uint256 | Deadline for this specific swap

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`amountIn`| uint256 | Amounts to be really put in
### swapExactTokensforTokens
```solidity
  function swapExactTokensforTokens(
    uint256 _amountIn,
    uint256 _amountOutMin,
    address _tokenIn,
    address _tokenOut,
    address _to,
    uint256 _deadline
  ) external returns (uint256 amountOut)
```
Amount in is fixed


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_amountIn` | uint256 | Fixed token input
|`_amountOutMin` | uint256 | Minimum token output
|`_tokenIn` | address | Address of input token
|`_tokenOut` | address | Address of output token
|`_to` | address | User address
|`_deadline` | uint256 | Deadline for this specific swap

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`amountOut`| uint256 | Amounts to be really given out
### transferHelper
```solidity
  function transferHelper(
    address _token,
    address _from,
    address _to,
    uint256 _amount
  ) internal
```
Finish the erc20 transfer operation


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_token` | address | ERC20 token address
|`_from` | address | Address to give out the token
|`_to` | address | Pair address to receive the token
|`_amount` | uint256 | Transfer amount

### _swap
```solidity
  function _swap(
    address _pair,
    uint256 _amountIn,
    uint256 _amountOut,
    bool _isBuying,
    address _to
  ) internal
```
Finish swap process


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_pair` | address | Address of the pair
|`_amountIn` | uint256 | Amount of tokens put in
|`_amountOut` | uint256 | Amount of tokens get out
|`_isBuying` | bool | Whether this is a purchase or a sell
|`_to` | address | Address of the user

### mintPolicyTokensForUser
```solidity
  function mintPolicyTokensForUser(
    address _policyTokenAddress,
    address _stablecoin,
    uint256 _amount,
    address _user
  ) internal
```
Used when users only provide stablecoins and want to mint & add liquidity in one step

Need have approval before

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyTokenAddress` | address | Address of the policy token
|`_stablecoin` | address | Address of the stablecoin
|`_amount` | uint256 | Amount to be used for minting policy tokens
|`_user` | address | The user's address

### _checkStablecoin
```solidity
  function _checkStablecoin(
  ) internal returns (bool)
```




### _getReserves
```solidity
  function _getReserves(
  ) internal returns (uint112 reserveA, uint112 reserveB)
```
Fetche the reserves for a pair

You need to sort the token order by yourself!
     No matter your input order, the return value will always start with policy token reserve.


### _getPairAddress
```solidity
  function _getPairAddress(
    address tokenA,
    address tokenB
  ) internal returns (address)
```
Get pair address


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`tokenA` | address | TokenA address
|`tokenB` | address | TokenB address

### _getAmountOut
```solidity
  function _getAmountOut(
    bool isBuying,
    uint256 _amountIn,
    address _tokenIn,
    address _tokenOut
  ) internal returns (uint256 amountOut)
```
Used when swap exact tokens for tokens (in is fixed)


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`isBuying` | bool | Whether the user is buying policy tokens
|`_amountIn` | uint256 | Amount of tokens put in
|`_tokenIn` | address | Address of the input token
|`_tokenOut` | address | Address of the output token

### _getAmountIn
```solidity
  function _getAmountIn(
    bool isBuying,
    uint256 _amountOut,
    address _tokenIn,
    address _tokenOut
  ) internal returns (uint256 amountIn)
```
Used when swap tokens for exact tokens (out is fixed)


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`isBuying` | bool | Whether the user is buying policy tokens
|`_amountOut` | uint256 | Amount of tokens given out
|`_tokenIn` | address | Address of the input token
|`_tokenOut` | address | Address of the output token

### _quote
```solidity
  function _quote(
    uint256 _amountA,
    uint256 _reserveA,
    uint256 _reserveB
  ) internal returns (uint256 amountB)
```
Given some amount of an asset and pair reserves, returns an equivalent amount of the other asset

Used when add or remove liquidity

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_amountA` | uint256 | Amount of tokenA ( can be policytoken or stablecoin)
|`_reserveA` | uint256 | Reserve of tokenA
|`_reserveB` | uint256 | Reserve of tokenB

## Events
### LiquidityAdded
```solidity
  event LiquidityAdded(
  )
```



### LiquidityRemoved
```solidity
  event LiquidityRemoved(
  )
```



