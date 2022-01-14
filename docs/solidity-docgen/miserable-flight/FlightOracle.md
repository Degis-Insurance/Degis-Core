This is the flight oracle contract.
        Called by policyFlow contract and send the request to chainlink node.
        After receiving the result, call the policyFlow contract to do the settlement.

   Remember to set the url, oracleAddress and jobId
        If there are multiple oracle providers in the future, this contract may need to be updated.

## Functions
### constructor
```solidity
  function constructor(
  ) public
```
Need the address of LINK token on specific network



### getChainlinkTokenAddress
```solidity
  function getChainlinkTokenAddress(
  ) external returns (address)
```
Returns the address of the LINK token

This is the public implementation for chainlinkTokenAddress, which is
     an internal method of the ChainlinkClient contract


### setOracleAddress
```solidity
  function setOracleAddress(
  ) external
```
Set the oracle address



### setJobId
```solidity
  function setJobId(
  ) external
```
Set a new job id



### setPolicyFlow
```solidity
  function setPolicyFlow(
  ) external
```
Change the policy flow contract address



### newOracleRequest
```solidity
  function newOracleRequest(
    uint256 _payment,
    string _url,
    string _path,
    int256 _times
  ) public returns (bytes32)
```
Creates a request to the specified Oracle contract address

This function ignores the stored Oracle contract address and
     will instead send the request to the address specified

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_payment` | uint256 | Payment to the oracle
|`_url` | string | The URL to fetch data from
|`_path` | string | The dot-delimited path to parse of the response
|`_times` | int256 | The number to multiply the result by

### fulfill
```solidity
  function fulfill(
    bytes32 _requestId,
    uint256 _data
  ) public
```
The fulfill method from requests created by this contract

The recordChainlinkFulfillment protects this function from being called
     by anyone other than the oracle address that the request was sent to

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_requestId` | bytes32 | The ID that was generated for the request
|`_data` | uint256 | The answer provided by the oracle

## Events
### OracleAddressChanged
```solidity
  event OracleAddressChanged(
  )
```



### JobIdChanged
```solidity
  event JobIdChanged(
  )
```



### PolicyFlowChanged
```solidity
  event PolicyFlowChanged(
  )
```



