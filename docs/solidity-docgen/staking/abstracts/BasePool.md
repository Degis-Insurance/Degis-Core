


## Functions
### constructor
```solidity
  function constructor(
  ) internal
```




### getDepositsLength
```solidity
  function getDepositsLength(
  ) external returns (uint256)
```




### pendingRewards
```solidity
  function pendingRewards(
  ) external returns (uint256)
```




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




### setDegisPerBlock
```solidity
  function setDegisPerBlock(
  ) external
```




### stake
```solidity
  function stake(
  ) external
```




### unstake
```solidity
  function unstake(
  ) external
```




### harvest
```solidity
  function harvest(
  ) external
```




### updatePool
```solidity
  function updatePool(
  ) public
```




### _stake
```solidity
  function _stake(
  ) internal
```




### _unstake
```solidity
  function _unstake(
    address _user,
    uint256 _depositId,
    uint256 _amount
  ) internal
```

Used internally, mostly by children implementations, see unstake()

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

1 year = 2e6
     1 week = 1e6
     2 weeks = 1e6 * ( 1 + 1 / 365)


### _pendingRewards
```solidity
  function _pendingRewards(
  ) internal returns (uint256 pending)
```




### _distributeReward
```solidity
  function _distributeReward(
  ) internal
```




### transferPoolToken
```solidity
  function transferPoolToken(
  ) internal
```




### transferPoolTokenFrom
```solidity
  function transferPoolTokenFrom(
  ) internal
```




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



