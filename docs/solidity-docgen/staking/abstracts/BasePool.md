


## Functions
### constructor
```solidity
  function constructor(
  ) internal
```
Constructor



### getUserDeposits
```solidity
  function getUserDeposits(
    address _user
  ) external returns (struct IPool.Deposit[])
```
Get a user's deposit info


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_user` | address | User address

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`s`| struct IPool.Deposit[] | deposit info
### pendingReward
```solidity
  function pendingReward(
    address _user
  ) external returns (uint256)
```
Get pending rewards


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_user` | address | User address

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`pendingReward`| uint256 | User's pending rewards
### rewardToWeight
```solidity
  function rewardToWeight(
  ) public returns (uint256)
```




### weightToReward
```solidity
  function weightToReward(
  ) public returns (uint256)
```




### setDegisPerSecond
```solidity
  function setDegisPerSecond(
  ) external
```




### stake
```solidity
  function stake(
    uint256 _amount,
    uint256 _lockUntil
  ) external
```
Stake tokens


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_amount` | uint256 | Amount of tokens to stake
|`_lockUntil` | uint256 | Lock until timestamp

### unstake
```solidity
  function unstake(
    uint256 _depositId,
    uint256 _amount
  ) external
```
Unstake tokens


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_depositId` | uint256 | Deposit id to be unstaked
|`_amount` | uint256 | Amount of tokens to unstake

### harvest
```solidity
  function harvest(
  ) external
```
Harvest your staking rewards



### updatePool
```solidity
  function updatePool(
  ) public
```
Update the pool without fee



### _updatePoolWithFee
```solidity
  function _updatePoolWithFee(
    uint256 _fee
  ) internal
```
Update pool status with fee (if any)


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_fee` | uint256 | Fee to be distributed

### _stake
```solidity
  function _stake(
    address _user,
    uint256 _amount,
    uint256 _lockUntil
  ) internal
```
Finish stake process


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_user` | address | User address
|`_amount` | uint256 | Amount of tokens to stake
|`_lockUntil` | uint256 | Lock until timestamp

### _unstake
```solidity
  function _unstake(
    address _user,
    uint256 _depositId,
    uint256 _amount
  ) internal
```
Finish unstake process


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_user` | address | User address
|`_depositId` | uint256 | deposit ID to unstake from, zero-indexed
|`_amount` | uint256 | amount of tokens to unstake

### timeToWeight
```solidity
  function timeToWeight(
  ) public returns (uint256 _weight)
```
Lock time => Lock weight

1 year = 2e6
     1 week = 1e6
     2 weeks = 1e6 * ( 1 + 1 / 365)


### _pendingReward
```solidity
  function _pendingReward(
    address _user
  ) internal returns (uint256 pending)
```
Check pending reward after update


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_user` | address | User address

### _distributeReward
```solidity
  function _distributeReward(
    address _user
  ) internal
```
Distribute reward to staker


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_user` | address | User address

### transferPoolToken
```solidity
  function transferPoolToken(
  ) internal
```
Transfer pool token from pool to user



### transferPoolTokenFrom
```solidity
  function transferPoolTokenFrom(
    address _from,
    address _to,
    uint256 _value
  ) internal
```
Transfer pool token from user to pool


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_from` | address | User address
|`_to` | address | Pool address
|`_value` | uint256 | Amount of tokens to transfer

### _safeDegisTransfer
```solidity
  function _safeDegisTransfer(
    address _to,
    uint256 _amount
  ) internal
```
Safe degis transfer (check if the pool has enough DEGIS token)


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_to` | address | User's address
|`_amount` | uint256 | Amount to transfer

## Events
### Stake
```solidity
  event Stake(
  )
```



### Unstake
```solidity
  event Unstake(
  )
```



### Harvest
```solidity
  event Harvest(
  )
```



