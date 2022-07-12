


## Functions
### initialize
```solidity
  function initialize(
  ) public
```
Constructor
        Only need to set farming pool address



### pendingReward
```solidity
  function pendingReward(
    address _token,
    address _user
  ) external returns (uint256 pending)
```
Get pending reward



#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_token` | address | Reward token address
|`_user` | address |  User address


#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`pending`| uint256 | Pending reward
### updatePool
```solidity
  function updatePool(
    address _rewardToken
  ) public
```
Update double reward pool



#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_rewardToken` | address | Reward token address

### setRewardSpeed
```solidity
  function setRewardSpeed(
    address _lpToken,
    address _rewardToken,
    uint256 _reward
  ) external
```
Set reward speed for a pool



#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_lpToken` | address |       LP token address
|`_rewardToken` | address |   Reward token address
|`_reward` | uint256 |        Reward per second

### addRewardToken
```solidity
  function addRewardToken(
  ) external
```




### distributeReward
```solidity
  function distributeReward(
    address _lpToken,
    address _rewardToken,
    address _user,
    uint256 _lpAmount
  ) external
```
Distribute reward when user get reward in farming pool
        User lpAmount will be updated here



#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_lpToken` | address |     LP token address
|`_rewardToken` | address | Reward token address
|`_user` | address |        User address
|`_lpAmount` | uint256 |    LP amount of user

### _safeRewardTransfer
```solidity
  function _safeRewardTransfer(
    address _to,
    address _amount
  ) internal returns (uint256)
```
Safe degis transfer (check if the pool has enough DEGIS token)



#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_to` | address |     User address
|`_amount` | address | Amount to transfer

### emergencyWithdraw
```solidity
  function emergencyWithdraw(
  ) external
```
Withdraw tokens
        When stopping double reward, first set the reward speed, then withdraw tokens



## Events
### DistributeReward
```solidity
  event DistributeReward(
  )
```



### NewRewardTokenAdded
```solidity
  event NewRewardTokenAdded(
  )
```



### RewardRateUpdated
```solidity
  event RewardRateUpdated(
  )
```



