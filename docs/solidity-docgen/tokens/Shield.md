
   Users can swap other stablecoins to Shield
        Shield can be used in NaughtyPrice and future products

        When users want to withdraw, their shield tokens will be burned
        and USDC will be sent back to them

        Currently, the swap is done inside Platypus

## Functions
### initialize
```solidity
  function initialize(
  ) public
```




### addSupportedStablecoin
```solidity
  function addSupportedStablecoin(
    address _stablecoin
  ) external
```
Add new supported stablecoin


Set the token address and collateral ratio at the same time
     The collateral ratio need to be less than 100
     Only callable by the owner


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_stablecoin` | address | Stablecoin address

### setPTPPool
```solidity
  function setPTPPool(
  ) external
```




### _getDiscount
```solidity
  function _getDiscount(
  ) internal returns (uint256)
```
Get discount by veDEG

The discount depends on veDEG


#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`discount`| uint256 | The discount for the user
### approveStablecoin
```solidity
  function approveStablecoin(
  ) external
```




### deposit
```solidity
  function deposit(
    address _stablecoin,
    uint256 _amount,
    uint256 _minAmount
  ) external
```
Deposit tokens and mint Shield


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_stablecoin` | address | Stablecoin address
|`_amount` | uint256 |     Input stablecoin amount
|`_minAmount` | uint256 |  Minimum amount output (if need swap)

### withdraw
```solidity
  function withdraw(
    uint256 _amount
  ) public
```
Withdraw stablecoins


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_amount` | uint256 | Amount of Shield to be burned

### withdrawAll
```solidity
  function withdrawAll(
  ) external
```
Withdraw all stablecoins



### decimals
```solidity
  function decimals(
  ) public returns (uint8)
```




### _swap
```solidity
  function _swap(
    address _fromToken,
    address _toToken,
    uint256 _fromAmount,
    uint256 _minToAmount,
    address _to,
    uint256 _deadline
  ) internal returns (uint256)
```
Swap stablecoin to USDC in PTP


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_fromToken` | address |   From token address
|`_toToken` | address |     To token address
|`_fromAmount` | uint256 |  Amount of from token
|`_minToAmount` | uint256 | Minimun output amount
|`_to` | address |          Address that will receive the output token
|`_deadline` | uint256 |    Deadline for this transaction

### _safeTokenTransfer
```solidity
  function _safeTokenTransfer(
    address _token,
    uint256 _amount
  ) internal returns (uint256 realAmount)
```
Safe token transfer

Not allowed to transfer more tokens than the current balance

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_token` | address |  Token address to be transferred
|`_amount` | uint256 | Amount of token to be transferred

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`realAmount`| uint256 | Real amount that has been transferred
## Events
### AddStablecoin
```solidity
  event AddStablecoin(
  )
```



### SetPTPPool
```solidity
  event SetPTPPool(
  )
```



### Deposit
```solidity
  event Deposit(
  )
```



### Withdraw
```solidity
  event Withdraw(
  )
```



