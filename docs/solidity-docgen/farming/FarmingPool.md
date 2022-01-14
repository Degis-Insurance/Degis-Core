This contract is for LPToken mining on Degis

   The pool id starts from 1 not 0

## Functions
### constructor
```solidity
  function constructor(
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
### getPoolList
```solidity
  function getPoolList(
  ) external returns (struct FarmingPool.PoolInfo[])
```
Get the total pool list



### getUserBalance
```solidity
  function getUserBalance(
    uint256 _poolId,
    address _user
  ) external returns (uint256 _balance)
```
Get user balance


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_poolId` | uint256 | Id of the pool
|`_user` | address | Address of the user

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`_balance`| uint256 | User's balance (lpToken)
### setStartBlock
```solidity
  function setStartBlock(
    uint256 _startBlock
  ) external
```
Set the start block number


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_startBlock` | uint256 | New start block number

### add
```solidity
  function add(
    address _lpToken,
    uint256 _degisPerBlock,
    bool _withUpdate
  ) public
```
Add a new lp to the pool. Can only be called by the owner.


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_lpToken` | address | LP token address
|`_degisPerBlock` | uint256 | Reward distribution per block for this new pool
|`_withUpdate` | bool | Whether update all pools' status

### stop
```solidity
  function stop(
  ) public
```




### setDegisReward
```solidity
  function setDegisReward(
    uint256 _poolId,
    uint256 _degisPerBlock,
    bool _withUpdate
  ) public
```
Update the degisPerBlock for a specific pool (set to 0 to stop farming)


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_poolId` | uint256 | Id of the farming pool
|`_degisPerBlock` | uint256 | New reward amount per block
|`_withUpdate` | bool | Whether update all the pool

### stake
```solidity
  function stake(
    uint256 _poolId,
    uint256 _amount
  ) public
```
Stake LP token into the farming pool


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
Withdraw lptoken from the pool


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_poolId` | uint256 | Id of the farming pool
|`_amount` | uint256 | Amount of lp tokens to withdraw

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

### harvest
```solidity
  function harvest(
    uint256 Id,
    address _to
  ) public
```
Harvest the degis reward and can be sent to another address


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`Id` | uint256 | of the farming pool
|`_to` | address | Receiver of degis rewards.

### harvestAndCompound
```solidity
  function harvestAndCompound(
  ) public
```




### massUpdatePools
```solidity
  function massUpdatePools(
  ) public
```
Update all farming pools (except for those stopped ones)



### _alreadyInPool
```solidity
  function _alreadyInPool(
    address _lpTokenAddress
  ) internal returns (bool _isInPool)
```
Check if a lptoken has been added into the pool before

This can be written as a modifier, I just want to test the error form

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_lpTokenAddress` | address | LP token address

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`_isInPool`| bool | Wether this lp already in pool
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
### StartBlockChanged
```solidity
  event StartBlockChanged(
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



### HarvestAndCompound
```solidity
  event HarvestAndCompound(
  )
```



### NewPoolAdded
```solidity
  event NewPoolAdded(
  )
```



### RestartFarmingPool
```solidity
  event RestartFarmingPool(
  )
```



### FarmingPoolStopped
```solidity
  event FarmingPoolStopped(
  )
```



### PoolUpdated
```solidity
  event PoolUpdated(
  )
```



