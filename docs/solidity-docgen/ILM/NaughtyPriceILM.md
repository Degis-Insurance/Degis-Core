Naughty Price timeline: 1 -- 14 -- 5
        The first day of each round would be the time for liquidity matching
        User
          - Select the naughty token
          - Provide stablecoins into this contract & Select your price choice
          - Change the amountA and amountB of this pair
        When reach deadline
          - Final price of ILM = Initial price of naughty price pair = amountA/amountB


## Functions
### initialize
```solidity
  function initialize(
    address _degis,
    address _policyCore,
    address _router,
    address _emergencyPool
  ) public
```
Initialze function for proxy

Called only when deploying proxy contract

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_degis` | address | Degis token address
|`_policyCore` | address | PolicyCore contract address
|`_router` | address | NaughtyRouter contract address
|`_emergencyPool` | address | EmergencyPool contract address

### getPrice
```solidity
  function getPrice(
    address _policyToken
  ) external returns (uint256)
```
Get the current price

Price has a scale of 1e12

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyToken` | address | Policy token address

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`price`| uint256 | Price of the token pair
### getPairTotalAmount
```solidity
  function getPairTotalAmount(
    address _policyToken
  ) external returns (uint256 totalAmount)
```
Get the total amount of a pair


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyToken` | address | Policy token address

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`totalAmount`| uint256 | Total amount of a pair
### getUserDeposit
```solidity
  function getUserDeposit(
    address _user,
    address _policyToken
  ) external returns (uint256 amountA, uint256 amountB)
```
Get the amount of user's deposit


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_user` | address | User address
|`_policyToken` | address | Policy token address

### emergencyStop
```solidity
  function emergencyStop(
    address _policyToken
  ) external
```
Emergency stop ILM


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyToken` | address | Policy token address to be stopped

### emergencyRestart
```solidity
  function emergencyRestart(
    address _policyToken
  ) external
```
Emergency restart ILM


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyToken` | address | Policy token address to be restarted

### startILM
```solidity
  function startILM(
    address _policyToken,
    address _stablecoin,
    uint256 _ILMDeadline
  ) external
```
Start a new ILM round

A new lp token will be deployed when starting a new ILM round
     It will have a special farming reward pool

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyToken` | address | Policy token address
|`_stablecoin` | address | Stablecoin address
|`_ILMDeadline` | uint256 | Deadline of ILM period

### finishILM
```solidity
  function finishILM(
    address _policyToken,
    uint256 _deadlineForSwap,
    uint256 _feeRate
  ) external
```
Finish a round of ILM

The swap pool for the protection token will be deployed with inital liquidity\
     The amount of initial liquidity will be the total amount of the pair
     Can be called by any address

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyToken` | address | Policy token address
|`_deadlineForSwap` | uint256 | Pool deadline
|`_feeRate` | uint256 | Fee rate of the swap pool

### deposit
```solidity
  function deposit(
    address _policyToken,
    address _stablecoin,
    uint256 _amountA,
    uint256 _amountB
  ) external
```
Deposit stablecoin and choose the price

Deposit only check the pair status not the deadline
     There may be a zero ILM and we still need to deposit some asset to make it start
     Anyone wants to enter ILM need to pay some DEG as entrance fee
     The ratio is 100:1(usd:deg) and your fee is distributed to the users prior to you

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyToken` | address | Policy token address
|`_stablecoin` | address | Stablecoin address
|`_amountA` | uint256 | Amount of policy token (virtual)
|`_amountB` | uint256 | Amount of stablecoin (virtual)

### withdraw
```solidity
  function withdraw(
    address _policyToken,
    address _stablecoin,
    uint256 _amountA,
    uint256 _amountB
  ) public
```
Withdraw stablecoins

Only checks the status not the deadline

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyToken` | address | Policy token address
|`_stablecoin` | address | Stablecoin address
|`_amountA` | uint256 | Amount of policy token (virtual)
|`_amountB` | uint256 | Amount of stablecoin (virtual)

### withdrawAll
```solidity
  function withdrawAll(
    address _policyToken,
    address _stablecoin
  ) external
```
Withdraw all stablecoins of a certain policy token


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyToken` | address | Policy token address
|`_stablecoin` | address | Stablecoin address

### claim
```solidity
  function claim(
    address _policyToken,
    address _stablecoin,
    uint256 _amountAMin,
    uint256 _amountBMin
  ) external
```
Claim liquidity back

You will get back some DEG (depending on how many users deposit after you)
     The claim amount is determined by the LP Token balance of you (you can buy from others)
     But the DEG reward would only be got once
     Your LP token will be burnt and you can not join ILM farming pool again

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyToken` | address | Policy token address
|`_stablecoin` | address | Stablecoin address
|`_amountAMin` | uint256 | Minimum amount of policy token (slippage)
|`_amountBMin` | uint256 | Minimum amount of stablecoin (slippage)

### emergencyWithdraw
```solidity
  function emergencyWithdraw(
    address _token,
    uint256 _amount
  ) external
```
Emergency withdraw a certain token


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_token` | address | Token address
|`_amount` | uint256 | Token amount

### approveStablecoin
```solidity
  function approveStablecoin(
    address _stablecoin
  ) external
```
Approve stablecoins for naughty price contracts


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_stablecoin` | address | Stablecoin address

### _deployLPToken
```solidity
  function _deployLPToken(
    string _name
  ) internal returns (address)
```
Deploy the new lp token for a round


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_name` | string | Name of the lp token

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`lpTokenAddress`| address | Address of the lp token
### _safeTokenTransfer
```solidity
  function _safeTokenTransfer(
    address _token,
    address _receiver,
    uint256 _amount
  ) internal returns (uint256)
```
Safely transfer tokens


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_token` | address | Token address
|`_receiver` | address | Receiver address
|`_amount` | uint256 | Amount of tokens

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`realAmount`| uint256 | Real amount that is transferred
### _updateWhenDeposit
```solidity
  function _updateWhenDeposit(
    address _policyToken,
    uint256 _usdAmount,
    uint256 _degAmount
  ) internal
```
Update debt & fee distribution


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyToken` | address | Policy token address
|`_usdAmount` | uint256 | Amount of stablecoins input
|`_degAmount` | uint256 | Amount of degis input

### _updateWhenClaim
```solidity
  function _updateWhenClaim(
    address _policyToken
  ) internal
```
Update degis reward when claim


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyToken` | address | Policy token address

## Events
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



### EmergencyWithdraw
```solidity
  event EmergencyWithdraw(
  )
```



### ILMFinish
```solidity
  event ILMFinish(
  )
```



### ILMStart
```solidity
  event ILMStart(
  )
```



### Harvest
```solidity
  event Harvest(
  )
```



### Claim
```solidity
  event Claim(
  )
```



