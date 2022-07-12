The staking contract for DEG -> veDEG
        veDEG:
           - Boosting the farming reward
           - Governance
           - Participate in Initial Liquidity Matching (naughty price)
           - etc.
        If you stake degis, you generate veDEG at the current `generationRate` until you reach `maxCap`
        If you unstake any amount of degis, you will lose all of your veDEG tokens

        There is also an option that you lock your DEG for the max time
        and get the maximum veDEG balance immediately.
        !! Attention !!
        If you stake DEG for the max time for more than once, the lockUntil timestamp will
        be updated to the latest one.


## Functions
### initialize
```solidity
  function initialize(
  ) public
```




### claimable
```solidity
  function claimable(
    address _user
  ) public returns (uint256)
```
Calculate the amount of veDEG that can be claimed by user


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_user` | address | User address

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`claimableAmount`| uint256 | Claimable amount of the user
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




### addWhitelist
```solidity
  function addWhitelist(
    address _account
  ) external
```
Add a new whitelist address

Only callable by the owner

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_account` | address | Address to add

### removeWhitelist
```solidity
  function removeWhitelist(
    address _account
  ) external
```
Remove a new whitelist address

Only callable by the owner

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_account` | address | Address to remove

### setMaxCapRatio
```solidity
  function setMaxCapRatio(
    uint256 _maxCapRatio
  ) external
```
Set maxCap ratio


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_maxCapRatio` | uint256 | the new max ratio

### setGenerationRate
```solidity
  function setGenerationRate(
    uint256 _generationRate
  ) external
```
Set generationRate


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_generationRate` | uint256 | New generation rate

### setNFTStaking
```solidity
  function setNFTStaking(
  ) external
```




### deposit
```solidity
  function deposit(
    uint256 _amount
  ) external
```
Depisit degis for veDEG

Only EOA or whitelisted contract address

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_amount` | uint256 | Amount to deposit

### depositMaxTime
```solidity
  function depositMaxTime(
  ) external
```
Deposit for the max time

Release the max amount one time


### claim
```solidity
  function claim(
  ) public
```
Claims accumulated veDEG for flex deposit



### withdraw
```solidity
  function withdraw(
    uint256 _amount
  ) external
```
Withdraw degis token

User will lose all veDEG once he withdrawed

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_amount` | uint256 | Amount to withdraw

### withdrawLocked
```solidity
  function withdrawLocked(
  ) external
```
Withdraw all the locked veDEG



### lockVeDEG
```solidity
  function lockVeDEG(
    address _to,
    uint256 _amount
  ) external
```
Lock veDEG token

Only whitelisted contract
     Income sharing contract will lock veDEG as entrance

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_to` | address | User address
|`_amount` | uint256 | Amount to lock

### unlockVeDEG
```solidity
  function unlockVeDEG(
    address _to,
    uint256 _amount
  ) external
```
Unlock veDEG token


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_to` | address | User address
|`_amount` | uint256 | Amount to unlock

### burnVeDEG
```solidity
  function burnVeDEG(
    address _to,
    uint256 _amount
  ) public
```
Burn veDEG

Only whitelisted contract
     For future use, some contracts may need veDEG for entrance

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_to` | address | Address to burn
|`_amount` | uint256 | Amount to burn

### boostVeDEG
```solidity
  function boostVeDEG(
    address _user,
    uint256 _type
  ) external
```
Boost veDEG


Only called by nftStaking contract


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_user` | address | User address
|`_type` | uint256 | Boost type (1 = 120%, 2 = 150%)

### unBoostVeDEG
```solidity
  function unBoostVeDEG(
    address _user
  ) external
```
UnBoost veDEG


Only called by nftStaking contract


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_user` | address | User address

### _claim
```solidity
  function _claim(
    address _user
  ) internal
```
Finish claiming veDEG


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_user` | address | User address

### _afterTokenOperation
```solidity
  function _afterTokenOperation(
    address _user,
    uint256 _newBalance
  ) internal
```
Update the bonus in farming pool

Every time when token is transferred (balance change)

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_user` | address | User address
|`_newBalance` | uint256 | New veDEG balance

### _lock
```solidity
  function _lock(
    address _to,
    uint256 _amount
  ) internal
```
Lock veDEG token


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_to` | address | User address
|`_amount` | uint256 | Amount to lock

### _unlock
```solidity
  function _unlock(
    address _to,
    uint256 _amount
  ) internal
```
Unlock veDEG token


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_to` | address | User address
|`_amount` | uint256 | Amount to unlock

### _getCapRatio
```solidity
  function _getCapRatio(
    address _user
  ) internal returns (uint256 realCapRatio)
```
Get real cap ratio for a user
        The ratio depends on the boost type



#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_user` | address | User address


#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`realCapRatio`| uint256 | Real cap ratio
## Events
### GenerationRateChanged
```solidity
  event GenerationRateChanged(
  )
```



### MaxCapRatioChanged
```solidity
  event MaxCapRatioChanged(
  )
```



### WhiteListAdded
```solidity
  event WhiteListAdded(
  )
```



### WhiteListRemoved
```solidity
  event WhiteListRemoved(
  )
```



### Deposit
```solidity
  event Deposit(
  )
```



### DepositMaxTime
```solidity
  event DepositMaxTime(
  )
```



### Withdraw
```solidity
  event Withdraw(
  )
```



### Claimed
```solidity
  event Claimed(
  )
```



### BurnVeDEG
```solidity
  event BurnVeDEG(
  )
```



### LockVeDEG
```solidity
  event LockVeDEG(
  )
```



### UnlockVeDEG
```solidity
  event UnlockVeDEG(
  )
```



### NFTStakingChanged
```solidity
  event NFTStakingChanged(
  )
```



### BoostVeDEG
```solidity
  event BoostVeDEG(
  )
```



### UnBoostVeDEG
```solidity
  event UnBoostVeDEG(
  )
```



