Emergency pool in degis will keep a reserve vault for emergency usage.
        The asset comes from part of the product's income (currently 10%).
        Users can also stake funds into this contract manually.
        The owner has the right to withdraw funds from emergency pool and it would be passed to community governance.


## Functions
### deposit
```solidity
  function deposit(
    address _tokenAddress,
    uint256 _amount
  ) external
```
Manually stake into the pool


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_tokenAddress` | address | Address of the ERC20 token
|`_amount` | uint256 | The amount that the user want to stake

### emergencyWithdraw
```solidity
  function emergencyWithdraw(
    address _tokenAddress,
    uint256 _amount
  ) external
```
Withdraw the asset when emergency (only by the owner)

The ownership need to be transferred to another contract in the future

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_tokenAddress` | address | Address of the ERC20 token
|`_amount` | uint256 | The amount that the user want to unstake

## Events
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



