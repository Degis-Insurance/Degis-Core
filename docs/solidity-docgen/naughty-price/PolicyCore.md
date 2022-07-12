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
        The rule of policyToken naming is:
             Original Token Name(with decimals) + Strike Price + Lower or Higher + Date
        E.g.  AVAX_30.0_L_2101, BTC_30000.0_L_2102, ETH_8000.0_H_2109
        (the original name need to be the same as in the chainlink oracle)
        There are three decimals for a policy token:
             1. Name decimals: Only for generating the name of policyToken
             2. Token decimals: The decimals of the policyToken
                (should be the same as the paired stablecoin)
             3. Price decimals: Always 18. The oracle result will be transferred for settlement

## Functions
### initialize
```solidity
  function initialize(
    address _usdc,
    address _factory,
    address _priceGetter
  ) public
```
Constructor, for some addresses


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_usdc` | address |        USDC.e is the first stablecoin supported in the pool
|`_factory` | address |     Address of naughty factory
|`_priceGetter` | address | Address of the oracle contract

### findAddressbyName
```solidity
  function findAddressbyName(
    string _policyTokenName
  ) public returns (address policyTokenAddress)
```
Find the token address by its name


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyTokenName` | string | Name of the policy token (e.g. "AVAX_30_L_2103")

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`policyTokenAddress`| address | Address of the policy token
### findNamebyAddress
```solidity
  function findNamebyAddress(
    address _policyTokenAddress
  ) public returns (string policyTokenName)
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
### getUserQuota
```solidity
  function getUserQuota(
    address _user,
    address _policyTokenAddress
  ) external returns (uint256 _quota)
```
Get a user's quota for a certain policy token


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_user` | address |               Address of the user to be checked
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

Include all active&expired tokens


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
Add a new supported stablecoin


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

### setIncomeSharing
```solidity
  function setIncomeSharing(
    address _incomeSharing
  ) external
```
Change the address of emergency pool


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_incomeSharing` | address | Address of the new incomeSharing

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

### setILMContract
```solidity
  function setILMContract(
    address _ILM
  ) external
```
Change the address of ILM


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_ILM` | address | Address of the new ILM

### setIncomeToLottery
```solidity
  function setIncomeToLottery(
    uint256 _toLottery
  ) external
```
Change the income part to lottery

The remaining part will be distributed to incomeSharing

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_toLottery` | uint256 | Proportion to lottery

### setIDOPriceGetter
```solidity
  function setIDOPriceGetter(
    address _idoPriceGetter
  ) external
```
Set IDO price getter contract


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_idoPriceGetter` | address | Address of the new IDO price getter contract

### deployPolicyToken
```solidity
  function deployPolicyToken(
    string _tokenName,
    address _stablecoin,
    bool _isCall,
    uint256 _nameDecimals,
    uint256 _tokenDecimals,
    uint256 _strikePrice,
    string _round,
    uint256 _deadline,
    uint256 _settleTimestamp,
    bool _isIDOPool
  ) external
```
Deploy a new policy token and return the token address

Only the owner can deploy new policy tokens
     The name form is like "AVAX_50_L_2203" and is built inside the contract
     Name decimals and token decimals are different here
     The original token name should be the same in Chainlink PriceFeeds
     Those tokens that are not listed on Chainlink are not supported

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_tokenName` | string |       Name of the original token (e.g. AVAX, BTC, ETH...)
|`_stablecoin` | address |      Address of the stablecoin (Just for check decimals here)
|`_isCall` | bool |          The policy is for higher or lower than the strike price (call / put)
|`_nameDecimals` | uint256 |    Decimals of this token's name (0~18)
|`_tokenDecimals` | uint256 |   Decimals of this token's value (0~18) (same as paired stablecoin)
|`_strikePrice` | uint256 |     Strike price of the policy (have already been transferred with 1e18)
|`_round` | string |           Round of the token (e.g. 2203 -> expired at 22 March)
|`_deadline` | uint256 |        Deadline of this policy token (deposit / redeem / swap)
|`_settleTimestamp` | uint256 | Can settle after this timestamp (for oracle)
|`_isIDOPool` | bool |       Whether this token is an IDO pool

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
|`_stablecoin` | address |      Address of the stable coin
|`_poolDeadline` | uint256 |    Swapping deadline of the pool (normally the same as the token's deadline)
|`_feeRate` | uint256 |         Fee rate given to LP holders

### deposit
```solidity
  function deposit(
    string _policyTokenName,
    address _stablecoin,
    uint256 _amount
  ) public
```
Deposit stablecoins and get policy tokens


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyTokenName` | string | Name of the policy token
|`_stablecoin` | address |      Address of the stable coin
|`_amount` | uint256 |          Amount of stablecoin

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
|`_stablecoin` | address |      Address of the sable coin
|`_amount` | uint256 |          Amount of stablecoin
|`_user` | address |            Address to receive the policy tokens

### redeem
```solidity
  function redeem(
    string _policyTokenName,
    address _stablecoin,
    uint256 _amount
  ) public
```
Burn policy tokens and redeem stablecoins

Redeem happens before the deadline and is different from claim/settle

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyTokenName` | string | Name of the policy token
|`_stablecoin` | address |      Address of the stablecoin
|`_amount` | uint256 |          Amount to redeem

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
|`_stablecoin` | address |      Address of the stablecoin

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
|`_stablecoin` | address |      Address of the stable coin
|`_amount` | uint256 |          Amount of stablecoin

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
Settle the policies for the users when insurance events do not happen
        Funds are automatically distributed back to the depositors

   Take care of the gas cost and can use the _startIndex and _stopIndex to control the size

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyTokenName` | string | Name of policy token
|`_stablecoin` | address |      Address of stablecoin
|`_startIndex` | uint256 |      Settlement start index
|`_stopIndex` | uint256 |       Settlement stop index

### collectIncome
```solidity
  function collectIncome(
    address _stablecoin
  ) public
```
Collect the income

Can be done by anyone, only when there is some income to be distributed

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_stablecoin` | address | Address of stablecoin

### updateUserQuota
```solidity
  function updateUserQuota(
    address _user,
    address _policyToken,
    uint256 _amount
  ) external
```
Update user quota from ILM when claim


When you claim your liquidity from ILM, you will get normal quota as you are using policyCore

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_user` | address |        User address
|`_policyToken` | address | PolicyToken address
|`_amount` | uint256 |      Quota amount

### _deployPool
```solidity
  function _deployPool(
    address _policyTokenAddress,
    address _stablecoin,
    uint256 _poolDeadline,
    uint256 _feeRate
  ) internal returns (address)
```
Finish deploying a pool



#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyTokenAddress` | address | Address of the policy token
|`_stablecoin` | address |         Address of the stable coin
|`_poolDeadline` | uint256 |       Swapping deadline of the pool (normally the same as the token's deadline)
|`_feeRate` | uint256 |            Fee rate given to LP holders


#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`poolAddress`| address | Address of the pool
### _deposit
```solidity
  function _deposit(
    string _policyTokenName,
    address _stablecoin,
    uint256 _amount,
    address _user
  ) internal
```
Finish Deposit



#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyTokenName` | string | Name of the policy token
|`_stablecoin` | address | Address of the sable coin
|`_amount` | uint256 | Amount of stablecoin
|`_user` | address | Address to receive the policy tokens

### _settlePolicy
```solidity
  function _settlePolicy(
    address _policyTokenAddress,
    address _stablecoin,
    uint256 _start,
    uint256 _stop
  ) internal returns (uint256 amountRemaining)
```
Settle the policy when the event does not happen



#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyTokenAddress` | address | Address of policy token
|`_stablecoin` | address | Address of stable coin
|`_start` | uint256 | Start index
|`_stop` | uint256 | Stop index

### _chargeFee
```solidity
  function _chargeFee(
    address _stablecoin,
    uint256 _amount
  ) internal returns (uint256)
```
Charge fee when redeem / claim



#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_stablecoin` | address | Stablecoin address
|`_amount` | uint256 |     Amount to redeem / claim


#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`amountWithFee`| uint256 | Amount with fee
### _generateName
```solidity
  function _generateName(
    string _tokenName,
    uint256 _decimals,
    uint256 _strikePrice,
    bool _isCall,
    string _round
  ) public returns (string)
```
Generate the policy token name



#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_tokenName` | string |   Name of the stike token (BTC, ETH, AVAX...)
|`_decimals` | uint256 |    Decimals of the name generation (0,1=>1, 2=>2)
|`_strikePrice` | uint256 | Strike price of the policy (18 decimals)
|`_isCall` | bool |      The policy's payoff is triggered when higher(true) or lower(false)
|`_round` | string |       Round of the policy, named by <month><day> (e.g. 0320, 1215)

### _frac
```solidity
  function _frac(
    uint256 x
  ) internal returns (uint256 result)
```
Calculate the fraction part of a number


The scale is fixed as 1e18 (decimal fraction)


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`x` | uint256 | Number to calculate


#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`result`| uint256 | Fraction result
## Events
### LotteryChanged
```solidity
  event LotteryChanged(
  )
```



### IncomeSharingChanged
```solidity
  event IncomeSharingChanged(
  )
```



### NaughtyRouterChanged
```solidity
  event NaughtyRouterChanged(
  )
```



### ILMChanged
```solidity
  event ILMChanged(
  )
```



### IncomeToLotteryChanged
```solidity
  event IncomeToLotteryChanged(
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



### PoolDeployedWithInitialLiquidity
```solidity
  event PoolDeployedWithInitialLiquidity(
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



### Redeem
```solidity
  event Redeem(
  )
```



### RedeemAfterSettlement
```solidity
  event RedeemAfterSettlement(
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



### PolicyTokensSettledForUsers
```solidity
  event PolicyTokensSettledForUsers(
  )
```



### UpdateUserQuota
```solidity
  event UpdateUserQuota(
  )
```



### IDOPriceGetterChanged
```solidity
  event IDOPriceGetterChanged(
  )
```



