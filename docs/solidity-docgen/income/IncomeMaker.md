
This contract will receive the transaction fee from swap pool
     Then it will transfer

## Functions
### initialize
```solidity
  function initialize(
    address _router,
    address _factory,
    address _vault
  ) public
```
Initialize function


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_router` | address | Address of the naughty router
|`_factory` | address | Address of the naughty factory
|`_vault` | address | Address of the income sharing vault

### convertIncome
```solidity
  function convertIncome(
    address _policyToken,
    address _stablecoin
  ) external
```
Convert the income to stablecoin and transfer to the incomeSharingVault


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyToken` | address | Address of the policy token
|`_stablecoin` | address | Address of the stablecoi

### emergencyWithdraw
```solidity
  function emergencyWithdraw(
    address _token,
    uint256 _amount
  ) external
```
Emergency withdraw by the owner


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_token` | address | Address of the token
|`_amount` | uint256 | Amount of the token

### _swap
```solidity
  function _swap(
    address _policyToken,
    address _stablecoin,
    uint256 _amount,
    address _to
  ) internal returns (uint256 amountOut)
```
Swap policy tokens to stablecoins


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyToken` | address | Address of policy token
|`_stablecoin` | address | Address of stablecoin
|`_amount` | uint256 | Amount of policy token
|`_to` | address | Address of the receiver

## Events
### IncomeToUSD
```solidity
  event IncomeToUSD(
  )
```



### ConvertIncome
```solidity
  event ConvertIncome(
  )
```



### EmergencyWithdraw
```solidity
  event EmergencyWithdraw(
  )
```



