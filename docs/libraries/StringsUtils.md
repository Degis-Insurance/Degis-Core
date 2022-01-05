
String operations.

## Functions
### byToString
```solidity
  function byToString(
    bytes32 _bytes
  ) internal returns (string)
```
Bytes to string (not human-readable form)


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_bytes` | bytes32 | Input bytes

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`stringBytes`| string | String form of the bytes
### addressToString
```solidity
  function addressToString(
    address _addr
  ) internal returns (string)
```
Transfer address to string (not change the content)


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_addr` | address | Input address

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`stringAddress`| string | String form of the address
### uintToString
```solidity
  function uintToString(
  ) internal returns (string)
```

Converts a `uint256` to its ASCII `string` decimal representation.


### uintToHexString
```solidity
  function uintToHexString(
  ) internal returns (string)
```

Converts a `uint256` to its ASCII `string` hexadecimal representation.


### uintToHexString
```solidity
  function uintToHexString(
  ) internal returns (string)
```

Converts a `uint256` to its ASCII `string` hexadecimal representation with fixed length.


