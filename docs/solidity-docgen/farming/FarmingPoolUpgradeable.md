This contract is for LPToken mining on Degis

   The pool id starts from 1 rather than 0
        The degis reward is calculated by timestamp rather than block number

        VeDEG will boost the farming speed by having a extra reward type
        The extra reward is shared by those staking lptokens with veDEG balances
        Every time the veDEG balance change, the reward will be updated

        The basic reward depends on the liquidity inside the pool (optional)
        Update with a piecewise function
        liquidity amount:   |---------------|------------------|----------------
                            0           threshold 1        threshold 2
         reward speed:            speed1          speed2             speed3

        The speed update will be updated one tx after the last tx that triggers the threshold
        The reward update will be another one tx later

        This piecewise-style reward can be used or not for each pool to decide
        Ways to start pools: 1) set the basic reward to >0 2) set the piecewise and threshold to >0
                stop pools: 1) set the basic reward to 0 2) set the piecewise and threshold to 0

        Double Reward


## Functions
### initialize
```solidity
  function initialize(
  ) public
```




### pendingDegis
```solidity
  function pendingDegis(
    uint256 _poolId,
    address _user
  ) external returns (uint256)
```
Check the amount of pending degis reward


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_poolId` | uint256 | PoolId of this farming pool
|`_user` | address | User address

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`pendingDegisAmount`| uint256 | Amount of pending degis
### pendingDoubleReward
```solidity
  function pendingDoubleReward(
  ) external returns (address doubleRewardToken, uint256 pending)
```




### getPoolList
```solidity
  function getPoolList(
  ) external returns (struct FarmingPoolUpgradeable.PoolInfo[])
```
Get the total pool list



#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`pooList`| struct FarmingPoolUpgradeable.PoolInfo[] | Total pool list
### getUserBalance
```solidity
  function getUserBalance(
    uint256 _poolId,
    address _user
  ) external returns (uint256)
```
Get a user's balance


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_poolId` | uint256 | Id of the pool
|`_user` | address | User address

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`balance`| uint256 | User's balance (lpToken)
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




### setVeDEG
```solidity
  function setVeDEG(
  ) external
```




### setStartTimestamp
```solidity
  function setStartTimestamp(
    uint256 _startTimestamp
  ) external
```
Set the start block timestamp


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_startTimestamp` | uint256 | New start block timestamp

### setPiecewise
```solidity
  function setPiecewise(
    uint256 _poolId,
    uint256[] _threshold,
    uint256[] _reward
  ) external
```
Set piecewise reward and threshold


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_poolId` | uint256 | Id of the pool
|`_threshold` | uint256[] | Piecewise threshold
|`_reward` | uint256[] | Piecewise reward

### setDoubleRewarderContract
```solidity
  function setDoubleRewarderContract(
  ) external
```
Set double rewarder contract



### add
```solidity
  function add(
    address _lpToken,
    uint256 _basicDegisPerSecond,
    uint256 _bonusDegisPerSecond,
    bool _withUpdate,
    address _doubleRewardToken
  ) public
```
Add a new lp into the pool

Can only be called by the owner
     The reward speed can be 0 and set later by setDegisReward function
     The pool may have a double reward token


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_lpToken` | address |             LP token address
|`_basicDegisPerSecond` | uint256 | Basic reward speed(per second) for this new pool
|`_bonusDegisPerSecond` | uint256 | Bonus reward speed(per second) for this new pool
|`_withUpdate` | bool |          Whether update all pools' status
|`_doubleRewardToken` | address |   Double reward token address


### setDegisReward
```solidity
  function setDegisReward(
    uint256 _poolId,
    uint256 _basicDegisPerSecond,
    uint256 _bonusDegisPerSecond,
    bool _withUpdate
  ) public
```
Update the degisPerSecond for a specific pool (set to 0 to stop farming)



#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_poolId` | uint256 |              Id of the farming pool
|`_basicDegisPerSecond` | uint256 | New basic reward amount per second
|`_bonusDegisPerSecond` | uint256 | New bonus reward amount per second
|`_withUpdate` | bool |          Whether update all pools

### stake
```solidity
  function stake(
    uint256 _poolId,
    uint256 _amount
  ) public
```
Stake LP token into the farming pool


Can only stake to the pools that are still farming


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_poolId` | uint256 | Id of the farming pool
|`_amount` | uint256 | Staking amount

### withdraw
```solidity
  function withdraw(
    uint256 _poolId,
    uint256 _amount
  ) public
```
Withdraw lptoken from the pool\



#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_poolId` | uint256 | Id of the farming pool
|`_amount` | uint256 | Amount of lp tokens to withdraw

### harvest
```solidity
  function harvest(
    uint256 _poolId,
    address _to
  ) public
```
Harvest the degis reward and can be sent to another address



#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_poolId` | uint256 | Id of the farming pool
|`_to` | address |     Receiver of degis rewards

### updatePool
```solidity
  function updatePool(
    uint256 _poolId
  ) public
```
Update the pool's reward status


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_poolId` | uint256 | Id of the farming pool

### massUpdatePools
```solidity
  function massUpdatePools(
  ) public
```
Update all farming pools (except for those stopped ones)

Can be called by anyone
     Only update those active pools


### updateBonus
```solidity
  function updateBonus(
    address _user,
    uint256 _newVeDEGBalance
  ) external
```
Update a user's bonus

When veDEG has balance change
     Only called by veDEG contract

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_user` | address | User address
|`_newVeDEGBalance` | uint256 | New veDEG balance

### _alreadyInPool
```solidity
  function _alreadyInPool(
    address _lpToken
  ) internal returns (bool _isInPool)
```
Check if a lptoken has been added into the pool before

This can also be written as a modifier

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_lpToken` | address | LP token address

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`_isInPool`| bool | Wether this lp is already in pool
### _safeDegisTransfer
```solidity
  function _safeDegisTransfer(
    address _to,
    uint256 _amount
  ) internal returns (uint256)
```
Safe degis transfer (check if the pool has enough DEGIS token)


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_to` | address | User's address
|`_amount` | uint256 | Amount to transfer

### _safeLPTransfer
```solidity
  function _safeLPTransfer(
    bool _out,
    address _lpToken,
    address _user,
    uint256 _amount
  ) internal returns (uint256)
```
Finish the transfer of LP Token

The lp token may have loss during transfer

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_out` | bool | Whether the lp token is out
|`_lpToken` | address | LP token address
|`_user` | address | User address
|`_amount` | uint256 | Amount of lp tokens

### _updateRewardSpeed
```solidity
  function _updateRewardSpeed(
    uint256 _poolId
  ) internal
```
Update the reward speed


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_poolId` | uint256 | Pool ID

## Events
### StartTimestampChanged
```solidity
  event StartTimestampChanged(
  )
```



### Stake
```solidity
  event Stake(
  )
```



### Withdraw
```solidity
  event Withdraw(
  )
```



### Harvest
```solidity
  event Harvest(
  )
```



### NewPoolAdded
```solidity
  event NewPoolAdded(
  )
```



### FarmingPoolStarted
```solidity
  event FarmingPoolStarted(
  )
```



### FarmingPoolStopped
```solidity
  event FarmingPoolStopped(
  )
```



### DegisRewardChanged
```solidity
  event DegisRewardChanged(
  )
```



### PoolUpdated
```solidity
  event PoolUpdated(
  )
```



