This contract will receive part of the income from Degis products
        And the income will be shared by DEG holders (in the form of veDEG)

        It is designed to be an ever-lasting reward

        At first the reward is USDC.e and later may be transferred to Shield
        To enter the income sharing vault, you need to lock some veDEG
            - When your veDEG is locked, it can not be withdrawed

        The reward is distributed per second like a farming pool
        The income will come from (to be updated)
            - IncomeMaker: Collect swap fee in naughty price pool
            - PolicyCore: Collect deposit/redeem fee in policy core


## Functions
### initialize
```solidity
  function initialize(
  ) public
```




### pendingReward
```solidity
  function pendingReward(
    uint256 _poolId,
    address _user
  ) external returns (uint256)
```
Pending reward


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_poolId` | uint256 | Pool Id
|`_user` | address |   User address

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`pendingReward`| uint256 | Amount of pending reward
### setRoundTime
```solidity
  function setRoundTime(
    uint256 _roundTime
  ) external
```
Set round time

Round time is only used for checking reward speed

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_roundTime` | uint256 | Round time in seconds

### startPool
```solidity
  function startPool(
    address _rewardToken
  ) external
```
Start a new income sharing pool

Normally there will be two pools
         - USDC.e as reward (1)
         - Shield as reward (2)

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_rewardToken` | address | Reward token address

### setRewardSpeed
```solidity
  function setRewardSpeed(
    uint256 _poolId,
    uint256 _rewardPerSecond
  ) external
```
Set reward speed for a pool


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_poolId` | uint256 | Pool id
|`_rewardPerSecond` | uint256 | Reward speed

### deposit
```solidity
  function deposit(
    uint256 _poolId,
    uint256 _amount
  ) external
```
Deposit


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_poolId` | uint256 | Pool Id
|`_amount` | uint256 | Amount of tokens to deposit

### withdrawAll
```solidity
  function withdrawAll(
    uint256 _poolId
  ) external
```
Withdraw all veDEG


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_poolId` | uint256 | Pool Id

### withdraw
```solidity
  function withdraw(
    uint256 _poolId,
    uint256 _amount
  ) public
```
Withdraw the reward from the pool


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_poolId` | uint256 | Pool Id
|`_amount` | uint256 | Amount to withdraw

### harvest
```solidity
  function harvest(
    uint256 _poolId,
    address _to
  ) public
```
Harvest income reward


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_poolId` | uint256 | Pool Id
|`_to` | address | Reward receiver address

### updatePool
```solidity
  function updatePool(
    uint256 _poolId
  ) public
```
Update pool


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_poolId` | uint256 | Pool id

### _safeRewardTransfer
```solidity
  function _safeRewardTransfer(
    address _to,
    address _amount
  ) internal returns (uint256)
```
Finish the reward token transfer

Safe means not transfer exceeds the balance of contract
     Manually change the reward speed

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_to` | address | Address to transfer
|`_amount` | address | Amount to transfer

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`realAmount`| uint256 | Real amount transferred
## Events
### RoundTimeChanged
```solidity
  event RoundTimeChanged(
  )
```



### NewRewardPoolStart
```solidity
  event NewRewardPoolStart(
  )
```



### RewardSpeedSet
```solidity
  event RewardSpeedSet(
  )
```



### PoolUpdated
```solidity
  event PoolUpdated(
  )
```



### Harvest
```solidity
  event Harvest(
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



