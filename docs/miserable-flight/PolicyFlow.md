


## Functions
### constructor
```solidity
  function constructor(
  ) public
```




### viewUserPolicy
```solidity
  function viewUserPolicy(
    address _user
  ) external returns (struct IPolicyStruct.PolicyInfo[])
```
Show a user's policies (all)


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_user` | address | User's address

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`userPolicies`| struct IPolicyStruct.PolicyInfo[] | User's all policy details
### getPolicyInfoById
```solidity
  function getPolicyInfoById(
    uint256 _policyId
  ) public returns (struct IPolicyStruct.PolicyInfo policy)
```
Get the policyInfo from its count/order


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyId` | uint256 | Total count/order of the policy = NFT tokenId

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`policy`| struct IPolicyStruct.PolicyInfo | A struct of information about this policy
### findPolicyBuyerById
```solidity
  function findPolicyBuyerById(
    uint256 _policyId
  ) public returns (address buyerAddress)
```
Get the policy buyer by policyId


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyId` | uint256 | Unique policy Id (uint256)

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`buyerAddress`| address | The buyer of this policy
### changeFee
```solidity
  function changeFee(
    uint256 _fee
  ) external
```
Change the oracle fee


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_fee` | uint256 | New oracle fee

### changeMaxPayoff
```solidity
  function changeMaxPayoff(
    uint256 _newMaxPayoff
  ) external
```
Change the max payoff


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_newMaxPayoff` | uint256 | New maxpayoff amount

### changeMinTimeBeforeDeparture
```solidity
  function changeMinTimeBeforeDeparture(
    uint256 _newMinTime
  ) external
```
How long before departure when users can not buy new policies


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_newMinTime` | uint256 | New time set

### setFlightOracle
```solidity
  function setFlightOracle(
    address _oracleAddress
  ) external
```
Change the oracle address


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_oracleAddress` | address | New oracle address

### setURL
```solidity
  function setURL(
  ) external
```
Set a new url



### setDelayThreshold
```solidity
  function setDelayThreshold(
    uint256 _thresholdMin,
    uint256 _thresholdMax
  ) external
```
Set the new delay threshold used for calculating payoff


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_thresholdMin` | uint256 | New minimum threshold
|`_thresholdMax` | uint256 | New maximum threshold

### newApplication
```solidity
  function newApplication(
    uint256 _productId,
    string _flightNumber,
    uint256 _premium,
    uint256 _departureTimestamp,
    uint256 _landingDate,
    uint256 _deadline,
    bytes signature
  ) public returns (uint256 _policyId)
```
Buy a new flight delay policy

The transaction should have the signature from the backend server

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_productId` | uint256 | ID of the purchased product (0: flightdelay; 1,2,3...: others)
|`_flightNumber` | string | Flight number in string (e.g. "AQ1299")
|`_premium` | uint256 | Premium of this policy (decimals: 18)
|`_departureTimestamp` | uint256 | Departure date of this flight (unix timestamp in s, not ms!)
|`_landingDate` | uint256 | Landing date of this flight (uinx timestamp in s, not ms!)
|`_deadline` | uint256 | Deadline for this purchase request
|`signature` | bytes | Use web3.eth.sign(hash(data), account) to generate the signature

### newClaimRequest
```solidity
  function newClaimRequest(
  ) public
```
Make a claim request
 @param _policyId The total order/id of the policy
 @param _flightNumber The flight number
 @param _timestamp The flight departure timestamp
 @param _path Which data in json needs to get
 @param _forceUpdate Owner can force to update



### policyOwnerTransfer
```solidity
  function policyOwnerTransfer(
    uint256 _tokenId,
    address _oldOwner,
    address _newOwner
  ) external
```
Update information when a policy token's ownership has been transferred

This function is called by the ERC721 contract of PolicyToken

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_tokenId` | uint256 | Token Id of the policy token
|`_oldOwner` | address | The initial owner
|`_newOwner` | address | The new owner

### finalSettlement
```solidity
  function finalSettlement(
    bytes32 _requestId,
    uint256 _result
  ) public
```
Do the final settlement, called by FlightOracle contract


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_requestId` | bytes32 | Chainlink request id
|`_result` | uint256 | Delay result (minutes) given by oracle

### _policyCheck
```solidity
  function _policyCheck(
    uint256 _payoff,
    uint256 _user,
    address _policyId
  ) internal
```
check the policy and then determine whether we can afford it


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_payoff` | uint256 | the payoff of the policy sold
|`_user` | uint256 | user's address
|`_policyId` | address | the unique policy ID

### policyExpired
```solidity
  function policyExpired(
    uint256 _premium,
    uint256 _payoff,
    address _user,
    uint256 _policyId
  ) internal
```
update the policy when it is expired


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_premium` | uint256 | the premium of the policy sold
|`_payoff` | uint256 | the payoff of the policy sold
|`_user` | address | user's address
|`_policyId` | uint256 | the unique policy ID

### _policyClaimed
```solidity
  function _policyClaimed(
    uint256 _premium,
    uint256 _payoff,
    address _user,
    uint256 _policyId
  ) internal
```
Update the policy when it is claimed


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_premium` | uint256 | Premium of the policy sold
|`_payoff` | uint256 | Payoff of the policy sold
|`_user` | address | User's address
|`_policyId` | uint256 | The unique policy ID

### calcPayoff
```solidity
  function calcPayoff(
    uint256 _delay
  ) internal returns (uint256)
```
The payoff formula


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_delay` | uint256 | Delay in minutes

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`the`| uint256 | final payoff volume
### _checkSignature
```solidity
  function _checkSignature(
    bytes signature,
    string _flightNumber,
    address _address,
    uint256 _premium,
    uint256 _deadline
  ) internal
```
Check whether the signature is valid


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`signature` | bytes | 65 byte array: [[v (1)], [r (32)], [s (32)]]
|`_flightNumber` | string | Flight number
|`_address` | address | userAddress
|`_premium` | uint256 | Premium of the policy
|`_deadline` | uint256 | Deadline of the application

## Events
### FeeChanged
```solidity
  event FeeChanged(
  )
```



### MaxPayoffChanged
```solidity
  event MaxPayoffChanged(
  )
```



### MinTimeBeforeDepartureChanged
```solidity
  event MinTimeBeforeDepartureChanged(
  )
```



### FlightOracleChanged
```solidity
  event FlightOracleChanged(
  )
```



### OracleUrlChanged
```solidity
  event OracleUrlChanged(
  )
```



### DelayThresholdChanged
```solidity
  event DelayThresholdChanged(
  )
```



### NewPolicyApplication
```solidity
  event NewPolicyApplication(
  )
```



### PolicySold
```solidity
  event PolicySold(
  )
```



### PolicyDeclined
```solidity
  event PolicyDeclined(
  )
```



### PolicyClaimed
```solidity
  event PolicyClaimed(
  )
```



### PolicyExpired
```solidity
  event PolicyExpired(
  )
```



### FulfilledOracleRequest
```solidity
  event FulfilledOracleRequest(
  )
```



### PolicyOwnerTransfer
```solidity
  event PolicyOwnerTransfer(
  )
```



