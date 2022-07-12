Mock oracle contract for test.


## Functions
### constructor
```solidity
  function constructor(
  ) public
```
Need the address of LINK token on specific network



### setPolicyFlow
```solidity
  function setPolicyFlow(
  ) external
```
Change the policy flow contract address



### setResult
```solidity
  function setResult(
  ) external
```




### newOracleRequest
```solidity
  function newOracleRequest(
    uint256 _payment,
    string _url,
    string _path,
    int256 _times
  ) public returns (bytes32 requestId)
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
    bytes32 _requestId
  ) public
```
The fulfill method from requests created by this contract

The recordChainlinkFulfillment protects this function from being called
     by anyone other than the oracle address that the request was sent to

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_requestId` | bytes32 | The ID that was generated for the request

## Events
### PolicyFlowChanged
```solidity
  event PolicyFlowChanged(
  )
```



