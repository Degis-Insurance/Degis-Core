


## Functions
### constructor
```solidity
  function constructor(
  ) public
```




### getPoolAddress
```solidity
  function getPoolAddress(
    address _poolToken
  ) external returns (address)
```
Get the pool address from pool token address


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_poolToken` | address | Pool token address

### getPoolData
```solidity
  function getPoolData(
    address _poolToken
  ) public returns (struct StakingPoolFactory.PoolData)
```
Get pool data from pool token address


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_poolToken` | address | Pool token address

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`poolData`| struct StakingPoolFactory.PoolData | Pool data struct
### setDegisPerSecond
```solidity
  function setDegisPerSecond(
    address _pool,
    uint256 _degisPerSecond
  ) external
```
Set degis per second for a pool


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_pool` | address | Address of the staking pool
|`_degisPerSecond` | uint256 | Degis reward per second

### createPool
```solidity
  function createPool(
    address _poolToken,
    uint256 _startTimestamp,
    uint256 _degisPerSecond
  ) external
```
Creates a staking pool and registers it within the factory

Only called by the owner

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_poolToken` | address | Pool token address
|`_startTimestamp` | uint256 | Start timestamp for reward
|`_degisPerSecond` | uint256 | Reward speed

### _registerPool
```solidity
  function _registerPool(
    address _poolAddr
  ) internal
```
Register a deployed pool instance within the factory


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_poolAddr` | address | Address of the already deployed pool instance

### mintReward
```solidity
  function mintReward(
    address _to,
    uint256 _amount
  ) external
```
Mint degis tokens as reward

With this function, we only need to add factory contract into minterList

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_to` | address | The address to mint tokens to
|`_amount` | uint256 | Amount of degis tokens to mint

## Events
### PoolRegistered
```solidity
  event PoolRegistered(
  )
```



### DegisPerSecondChanged
```solidity
  event DegisPerSecondChanged(
  )
```



