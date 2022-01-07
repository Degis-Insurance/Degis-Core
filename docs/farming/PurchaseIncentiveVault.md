This is the purchase incentive vault for staking buyer tokens.
        Users first stake their buyer tokens and wait for distribution.
        About every 24 hours, the reward will be calculated to users' account.
        After disrtribution, users' reward balance will update but they still need to manually claim the reward.


## Functions
### constructor
```solidity
  function constructor(
  ) public
```




### getTotalUsersInRound
```solidity
  function getTotalUsersInRound(
    uint256 _round
  ) public returns (uint256)
```
Get the amount of users in _round, used for distribution


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_round` | uint256 | Round number to check

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`totalUsers`| uint256 | Total amount of users in _round
### getUserShares
```solidity
  function getUserShares(
    address _user
  ) public returns (uint256)
```
Get your shares in the current round


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_user` | address | Address of the user

### pendingReward
```solidity
  function pendingReward(
  ) public returns (uint256)
```
Get a user's pending reward



#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`userPendingReward`| uint256 | User's pending reward
### setDegisPerRound
```solidity
  function setDegisPerRound(
    uint256 _degisPerRound
  ) external
```
Set degis distribution per round


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_degisPerRound` | uint256 | Degis distribution per round to be set

### setDistributionInterval
```solidity
  function setDistributionInterval(
    uint256 _newInterval
  ) external
```
Set a new distribution interval


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_newInterval` | uint256 | The new interval

### stake
```solidity
  function stake(
    uint256 _amount
  ) external
```
Stake buyer tokens into this contract


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_amount` | uint256 | Amount of buyer tokens to stake

### redeem
```solidity
  function redeem(
    uint256 _amount
  ) external
```
Redeem buyer token from the vault


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_amount` | uint256 | Amount to redeem

### settleCurrentRound
```solidity
  function settleCurrentRound(
  ) external
```
Setttle the current round



### claimOwnReward
```solidity
  function claimOwnReward(
  ) external
```
User can claim his own reward



## Events
### DegisPerRoundChanged
```solidity
  event DegisPerRoundChanged(
  )
```



### DistributionIntervalChanged
```solidity
  event DistributionIntervalChanged(
  )
```



### Stake
```solidity
  event Stake(
  )
```



### Redeem
```solidity
  event Redeem(
  )
```



### RewardClaimed
```solidity
  event RewardClaimed(
  )
```



