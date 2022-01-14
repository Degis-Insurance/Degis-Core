Core logic of Naughty Price Product
        Preset:
             (Done in the naughtyFactory contract)
             1. Deploy policyToken contract
             2. Deploy policyToken-Stablecoin pool contract
        User Interaction:
             1. Deposit Stablecoin and mint PolicyTokens
             2. Redeem their Stablecoin and burn the PolicyTokens (before settlement)
             3. Claim for payout with PolicyTokens (after settlement)
        PolicyTokens are minted with the ratio 1:1 to Stablecoin
        The PolicyTokens are traded in the pool with CFMM (xy=k)
        When the event happens, a PolicyToken can be burned for claiming 1 Stablecoin.
        When the event does not happen, the PolicyToken depositors can
        redeem their 1 deposited Stablecoin

   Most of the functions to be called from outside will use the name of policyToken
        rather than the address (easy to read).
        Other variables or functions still use address to index.
        The rule of policyToken naming is Original Token Name + Strike Price + Lower or Higher + Date
        E.g.  AVAX_30_L_2101, BTC_30000_L_2102, ETH_8000_H_2109

## Functions
### constructor
```solidity
  function constructor(
    address _usdt,
    address _factory,
    address _priceGetter
  ) public
```
Constructor, for some addresses


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_usdt` | address | USDT is the first stablecoin supported in the pool
|`_factory` | address | Address of naughty factory
|`_priceGetter` | address | Address of the oracle contract

### findAddressbyName
```solidity
  function findAddressbyName(
    string _policyTokenName
  ) public returns (address)
```
Find the token address by its name


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyTokenName` | string | Name of the policy token (e.g. "AVAX30L202103")

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`policyTokenAddress`| address | Address of the policy token
### findNamebyAddress
```solidity
  function findNamebyAddress(
    address _policyTokenAddress
  ) public returns (string)
```
Find the token name by its address


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyTokenAddress` | address | Address of the policy token

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`policyTokenName`| string | Name of the policy token
### getPolicyTokenInfo
```solidity
  function getPolicyTokenInfo(
    string _policyTokenName
  ) public returns (struct PolicyCore.PolicyTokenInfo)
```
Find the token information by its name


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyTokenName` | string | Name of the policy token (e.g. "AVAX30L202103")

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`policyTokenInfo`| struct PolicyCore.PolicyTokenInfo | PolicyToken detail information
### checkUserQuota
```solidity
  function checkUserQuota(
    address _user,
    address _policyTokenAddress
  ) external returns (uint256 _quota)
```
Check a user's quota for a certain policy token


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_user` | address | Address of the user to be checked
|`_policyTokenAddress` | address | Address of the policy token

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`_quota`| uint256 | User's quota result
### getAllTokens
```solidity
  function getAllTokens(
  ) external returns (struct PolicyCore.PolicyTokenInfo[])
```
Get the information about all the tokens



#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`tokensInfo`| struct PolicyCore.PolicyTokenInfo[] | Token information list
### addStablecoin
```solidity
  function addStablecoin(
    address _newStablecoin
  ) external
```
Add a newly supported stablecoin


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_newStablecoin` | address | Address of the new stablecoin

### setLottery
```solidity
  function setLottery(
    address _lotteryAddress
  ) external
```
Change the address of lottery


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_lotteryAddress` | address | Address of the new lottery

### setEmergencyPool
```solidity
  function setEmergencyPool(
    address _emergencyPool
  ) external
```
Change the address of emergency pool


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_emergencyPool` | address | Address of the new emergencyPool

### setNaughtyRouter
```solidity
  function setNaughtyRouter(
    address _router
  ) external
```
Change the address of naughty router


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_router` | address | Address of the new naughty router

### deployPolicyToken
```solidity
  function deployPolicyToken(
    string _tokenName,
    bool _isCall,
    uint256 _decimals,
    uint256 _strikePrice,
    uint256 _deadline,
    uint256 _settleTimestamp
  ) external returns (address)
```
Deploy a new policy token and return the token address

Only the owner can deploy new policy token
     The name form is like "AVAX_50_L_202101" and is built inside the contract.

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_tokenName` | string | Name of the original token (e.g. AVAX, BTC, ETH...)
|`_isCall` | bool | The policy is for higher or lower than the strike price (call / put)
|`_decimals` | uint256 | Decimals of this token's price (0~18)
|`_strikePrice` | uint256 | Strike price of the policy (have not been transferred with 1e18)
|`_deadline` | uint256 | Deadline of this policy token (deposit / redeem / swap)
|`_settleTimestamp` | uint256 | Can settle after this timestamp (for oracle)

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`policyTokenAddress`| address | The address of the policy token just deployed
### deployPool
```solidity
  function deployPool(
    string _policyTokenName,
    address _stablecoin,
    uint256 _poolDeadline,
    uint256 _feeRate
  ) external returns (address)
```
Deploy a new pair (pool)


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyTokenName` | string | Name of the policy token
|`_stablecoin` | address | Address of the stable coin
|`_poolDeadline` | uint256 | Swapping deadline of the pool
|`_feeRate` | uint256 | Fee rate given to LP holders

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`poolAddress`| address | The address of the pool just deployed
### deposit
```solidity
  function deposit(
    string _policyTokenName,
    address _stablecoin,
    uint256 _amount
  ) external
```
Deposit stablecoins and get policy tokens


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyTokenName` | string | Name of the policy token
|`_stablecoin` | address | Address of the sable coin
|`_amount` | uint256 | Amount of stablecoin (also the amount of policy tokens)

### delegateDeposit
```solidity
  function delegateDeposit(
    string _policyTokenName,
    address _stablecoin,
    uint256 _amount,
    address _user
  ) external
```
Delegate deposit (deposit and mint for other addresses)

Only called by the router contract

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyTokenName` | string | Name of the policy token
|`_stablecoin` | address | Address of the sable coin
|`_amount` | uint256 | Amount of stablecoin (also the amount of policy tokens)
|`_user` | address | Address to receive the policy tokens

### redeem
```solidity
  function redeem(
    string _policyTokenName,
    address _stablecoin,
    uint256 _amount
  ) public
```
Burn policy tokens and redeem USDT

Redeem happens before the deadline and is different from claim/settle

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyTokenName` | string | Name of the policy token
|`_stablecoin` | address | Address of the stablecoin
|`_amount` | uint256 | Amount of USDT (also the amount of policy tokens)

### redeemAfterSettlement
```solidity
  function redeemAfterSettlement(
    string _policyTokenName,
    address _stablecoin
  ) public
```
Redeem policy tokens and get stablecoins by the user himeself


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyTokenName` | string | Name of the policy token
|`_stablecoin` | address | Address of the stablecoin

### claim
```solidity
  function claim(
    string _policyTokenName,
    address _stablecoin,
    uint256 _amount
  ) public
```
Claim a payoff based on policy tokens

It is done after result settlement and only if the result is true

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyTokenName` | string | Name of the policy token
|`_stablecoin` | address | Address of the stable coin
|`_amount` | uint256 | Amount of USDT (also the amount of policy tokens)

### settleFinalResult
```solidity
  function settleFinalResult(
    string _policyTokenName
  ) public
```
Get the final price from the PriceGetter contract


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyTokenName` | string | Name of the policy token

### settleAllPolicyTokens
```solidity
  function settleAllPolicyTokens(
    string _policyTokenName,
    address _stablecoin,
    uint256 _startIndex,
    uint256 _stopIndex
  ) public
```
Settle the policies when then insurance event do not happen
        Funds are automatically distributed back to the depositors

   Take care of the gas cost and can use the _startIndex and _stopIndex to control the size

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyTokenName` | string | Name of policy token
|`_stablecoin` | address | Address of stablecoin
|`_startIndex` | uint256 | Settlement start index
|`_stopIndex` | uint256 | Settlement stop index

### _finishSettlement
```solidity
  function _finishSettlement(
    address _policyTokenAddress,
    address _stablecoin
  ) internal
```
Finish settlement process


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyTokenAddress` | address | Address of the policy token
|`_stablecoin` | address | Address of stable coin

### _mintPolicyToken
```solidity
  function _mintPolicyToken(
    address _policyTokenAddress,
    uint256 _amount,
    address _user
  ) internal
```
Mint Policy Token 1:1 USD
        The policy token need to be deployed first!


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyTokenAddress` | address | Address of the policy token
|`_amount` | uint256 | Amount to mint
|`_user` | address | Address to receive the policy token

### _redeemPolicyToken
```solidity
  function _redeemPolicyToken(
    address _policyTokenAddress,
    address _stablecoin,
    uint256 _amount
  ) internal
```
Finish the process of redeeming policy tokens

This internal function is used for redeeming and claiming

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyTokenAddress` | address | Address of policy token
|`_stablecoin` | address | Address of stable coin
|`_amount` | uint256 | Amount to claim

### _settlePolicy
```solidity
  function _settlePolicy(
    address _policyTokenAddress,
    address _stablecoin,
    uint256 _start,
    uint256 _stop
  ) internal
```
Settle the policy when the event does not happen


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyTokenAddress` | address | Address of policy token
|`_stablecoin` | address | Address of stable coin
|`_start` | uint256 | Start index
|`_stop` | uint256 | Stop index

### _generateName
```solidity
  function _generateName(
    string _tokenName,
    uint256 _decimals,
    uint256 _strikePrice,
    bool _isCall,
    uint256 _round
  ) internal returns (string)
```
Generate the policy token name


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_tokenName` | string | Name of the token
|`_decimals` | uint256 | Decimals of the name generation (0,1=>1)
|`_strikePrice` | uint256 | Strike price of the policy
|`_isCall` | bool | The policy's payoff is triggered when higher or lower
|`_round` | uint256 | Round of the policy (e.g. 2112, 2201)

## Events
### LotteryChanged
```solidity
  event LotteryChanged(
  )
```



### EmergencyPoolChanged
```solidity
  event EmergencyPoolChanged(
  )
```



### NaughtyRouterChanged
```solidity
  event NaughtyRouterChanged(
  )
```



### PolicyTokenDeployed
```solidity
  event PolicyTokenDeployed(
  )
```



### PoolDeployed
```solidity
  event PoolDeployed(
  )
```



### Deposit
```solidity
  event Deposit(
  )
```



### DelegateDeposit
```solidity
  event DelegateDeposit(
  )
```



### FinalResultSettled
```solidity
  event FinalResultSettled(
  )
```



### NewStablecoinAdded
```solidity
  event NewStablecoinAdded(
  )
```



### FinishSettlementPolicies
```solidity
  event FinishSettlementPolicies(
  )
```



