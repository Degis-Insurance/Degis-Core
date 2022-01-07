


## Functions
### constructor
```solidity
  function constructor(
    address _degisToken
  ) public
```

Creates/deploys a factory instance


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_degisToken` | address | Degis token address

### getPoolAddress
```solidity
  function getPoolAddress(
  ) external returns (address)
```




### getPoolData
```solidity
  function getPoolData(
  ) public returns (struct StakingPoolFactory.PoolData)
```




### setDegisPerBlock
```solidity
  function setDegisPerBlock(
  ) external
```
Set degis per block



### createPool
```solidity
  function createPool(
    address poolToken,
    uint256 startBlock,
    uint256 degisPerBlock
  ) external
```

Creates a staking pool and registers it within the factory

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`poolToken` | address | pool token address 
|`startBlock` | uint256 | init block to be used for the pool created
|`degisPerBlock` | uint256 | weight of the pool to be created

### registerPool
```solidity
  function registerPool(
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
    address by,
    address poolToken,
    address poolAddress,
    uint256 degisPerBlock,
    bool isFlashPool
  )
```

Fired in createPool() and registerPool()


#### Parameters:
| Name                           | Type          | Description                                    |
| :----------------------------- | :------------ | :--------------------------------------------- |
|`by`| address | who deploys a new pool
|`poolToken`| address | pool token address 
|`poolAddress`| address | deployed pool instance address
|`degisPerBlock`| uint256 | pool weight
|`isFlashPool`| bool | flag indicating if pool is a flash pool
### DegisPerBlockChanged
```solidity
  event DegisPerBlockChanged(
  )
```



