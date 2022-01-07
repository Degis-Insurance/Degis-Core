Insurance pool is the reserved risk pool for flight delay product.
        For simplicity, some state variables are in the InsurancePoolStore contract.


## Functions
### constructor
```solidity
  function constructor(
    address _emergencyPool,
    address _degisLottery,
    address _usdtAddress
  ) public
```
Constructor function


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_emergencyPool` | address | Emergency pool address
|`_degisLottery` | address | Lottery address
|`_usdtAddress` | address | USDT address

### getUserBalance
```solidity
  function getUserBalance(
    address _user
  ) public returns (uint256 _userBalance)
```
Get the real balance: LPValue * LP_Num

Used in many places so give it a seperate function

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_user` | address | User's address

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`_userBalance`| uint256 | Real balance of this user
### getUnlockedFor
```solidity
  function getUnlockedFor(
    address _user
  ) public returns (uint256 _unlockedAmount)
```
Get the balance that one user(LP) can unlock


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_user` | address | User's address

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`_unlockedAmount`| uint256 | Unlocked amount of the pool
### checkCapacity
```solidity
  function checkCapacity(
    uint256 _payoff
  ) external returns (bool)
```
Check the conditions when receive new buying request


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_payoff` | uint256 | Payoff of the policy to be bought

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`Whether`| bool | there is enough capacity in the pool for this payoff
### setFrozenTime
```solidity
  function setFrozenTime(
    uint256 _newFrozenTime
  ) external
```
Set a new frozen time


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_newFrozenTime` | uint256 | New frozen time, in timestamp(s)

### setPolicyFlow
```solidity
  function setPolicyFlow(
  ) public
```
Set the address of policyFlow



### setIncomeDistribution
```solidity
  function setIncomeDistribution(
    uint256[3] _newDistribution
  ) public
```
Set the premium reward distribution


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_newDistribution` | uint256[3] | New distribution [LP, Lottery, Emergency]

### setCollateralFactor
```solidity
  function setCollateralFactor(
    uint256 _factor
  ) public
```
Change the collateral factor


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_factor` | uint256 | The new collateral factor

### stake
```solidity
  function stake(
    uint256 _amount
  ) external
```
LPs stake assets into the pool


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_amount` | uint256 | The amount that the user want to stake

### unstake
```solidity
  function unstake(
    uint256 _amount
  ) external
```
Unstake from the pool (May fail if a claim happens before this operation)

Only unstake by yourself

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_amount` | uint256 | The amount that the user want to unstake

### unstakeMax
```solidity
  function unstakeMax(
  ) external
```
Unstake the max amount of a user



### updateWhenBuy
```solidity
  function updateWhenBuy(
    uint256 _premium,
    uint256 _payoff,
    address _user
  ) external
```
Update the pool variables when buying policies

Capacity check is done before calling this function

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_premium` | uint256 | Policy's premium
|`_payoff` | uint256 | Policy's payoff (max payoff)
|`_user` | address | Address of the buyer

### updateWhenExpire
```solidity
  function updateWhenExpire(
    uint256 _premium,
    uint256 _payoff
  ) external
```
Update the status when a policy expires


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_premium` | uint256 | Policy's premium
|`_payoff` | uint256 | Policy's payoff (max payoff)

### payClaim
```solidity
  function payClaim(
    uint256 _premium,
    uint256 _payoff,
    uint256 _realPayoff,
    address _user
  ) external
```
Pay a claim


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_premium` | uint256 | Premium of the policy
|`_payoff` | uint256 | Max payoff of the policy
|`_realPayoff` | uint256 | Real payoff of the policy
|`_user` | address | Address of the policy claimer

### revertUnstakeRequest
```solidity
  function revertUnstakeRequest(
    address _user
  ) public
```
revert the last unstake request for a user


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_user` | address | user's address

### revertAllUnstakeRequest
```solidity
  function revertAllUnstakeRequest(
    address _user
  ) public
```
revert all unstake requests for a user


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_user` | address | user's address

### _removeAllRequest
```solidity
  function _removeAllRequest(
    address _user
  ) internal
```
Remove all unstake requests for a user


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_user` | address | User's address

### _removeOneRequest
```solidity
  function _removeOneRequest(
    address _user
  ) internal
```
Remove one(the latest) unstake requests for a user


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_user` | address | User's address

### _deposit
```solidity
  function _deposit(
    address _user,
    uint256 _amount
  ) internal
```
Finish the deposit process

LPValue will not change during deposit

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_user` | address | Address of the user who deposits
|`_amount` | uint256 | Amount he deposits

### _withdraw
```solidity
  function _withdraw(
    address _user,
    uint256 _amount
  ) internal
```
_withdraw: finish the withdraw action, only when meeting the conditions

LPValue will not change during withdraw

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_user` | address | address of the user who withdraws
|`_amount` | uint256 | the amount he withdraws

### _distributePremium
```solidity
  function _distributePremium(
    uint256 _premium
  ) internal
```
Distribute the premium to lottery and emergency pool


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_premium` | uint256 | Premium amount to be distributed

### _updateLPValue
```solidity
  function _updateLPValue(
  ) internal
```
Update the value of each lp token

Normally it will update when claim or expire


### _updateLockedRatio
```solidity
  function _updateLockedRatio(
  ) internal
```
Update the pool's locked ratio



### _dealUnstakeQueue
```solidity
  function _dealUnstakeQueue(
    uint256 remainingPayoff
  ) internal
```
When some capacity unlocked, deal with the unstake queue

Normally we do not need this process

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`remainingPayoff` | uint256 | Remaining payoff amount

