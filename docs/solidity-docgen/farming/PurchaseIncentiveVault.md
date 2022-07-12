This is the purchase incentive vault for staking buyer tokens
        Users first stake their buyer tokens and wait for distribution
        About every 24 hours, the reward will be calculated to users' account
        After disrtribution, reward will be updated
             but it still need to be manually claimed.

        Buyer tokens can only be used once
        You can withdraw your buyer token within the same round (current round)
        They can not be withdrawed if the round was settled


## Functions
### initialize
```solidity
  function initialize(
  ) public
```




### getTotalUsersInRound
```solidity
  function getTotalUsersInRound(
    uint256 _round
  ) external returns (uint256)
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
### getUsersInRound
```solidity
  function getUsersInRound(
    uint256 _round
  ) external returns (address[])
```
Get the user addresses in _round


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_round` | uint256 | Round number to check

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`users`| address[] | All user addresses in this round
### getUserPendingRounds
```solidity
  function getUserPendingRounds(
    address _user
  ) external returns (uint256[])
```
Get user's pending rounds


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_user` | address | User address to check

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`pendingRounds`| uint256[] | User's pending rounds
### getUserShares
```solidity
  function getUserShares(
    address _user,
    uint256 _round
  ) external returns (uint256)
```
Get your shares in the current round


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_user` | address | Address of the user
|`_round` | uint256 | Round number

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`userShares`| uint256 | User's shares in the current round
### pendingReward
```solidity
  function pendingReward(
    address _user
  ) external returns (uint256 userPendingReward)
```
Get a user's pending reward


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_user` | address | User address

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`userPendingReward`| uint256 | User's pending reward
### getRewardPerRound
```solidity
  function getRewardPerRound(
  ) public returns (uint256 rewardPerRound)
```
Get degis reward per round

Depends on the total shares in this round


#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`rewardPerRound`| uint256 | Degis reward per round
### pause
```solidity
  function pause(
  ) external
```




### unpause
```solidity
  function unpause(
  ) external
```




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
|`_degisPerRound` | uint256 | Degis distribution per round

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

### setPiecewise
```solidity
  function setPiecewise(
    uint256[] _threshold,
    uint256[] _reward
  ) external
```
Set the threshold and piecewise reward


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_threshold` | uint256[] | The threshold
|`_reward` | uint256[] | The piecewise reward

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

Callable by any address, must pass the distribution interval


### claim
```solidity
  function claim(
  ) external
```
User can claim his own reward



## Events
### DegisRewardChanged
```solidity
  event DegisRewardChanged(
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



### RoundSettled
```solidity
  event RoundSettled(
  )
```



