


## Functions
### constructor
```solidity
  function constructor(
  ) public
```




### _stake
```solidity
  function _stake(
    address _user,
    uint256 _amount,
    uint256 _lockUntil
  ) internal
```
Stake function, will call the stake in BasePool


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_user` | address | User address
|`_amount` | uint256 | Amount to stake
|`_lockUntil` | uint256 | Lock until timestamp (0 means flexible staking)

### _unstake
```solidity
  function _unstake(
    address _user,
    uint256 _depositId,
    uint256 _amount
  ) internal
```
Unstake function, will check some conditions and call the unstake in BasePool


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_user` | address | User address
|`_depositId` | uint256 | Deposit id
|`_amount` | uint256 | Amount to unstake

