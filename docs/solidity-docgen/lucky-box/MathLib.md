


## Functions
### log_2
```solidity
  function log_2(
  ) internal returns (int128)
```




### mul
```solidity
  function mul(
  ) internal returns (int128)
```




### fromUInt
```solidity
  function fromUInt(
    uint256 x
  ) internal returns (int128)
```
Convert unsigned 256-bit integer number into signed 64.64-bit fixed point
number.  Revert on overflow.



#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`x` | uint256 | unsigned 256-bit integer number

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`signed`| int128 | 64.64-bit fixed point number
### toUInt
```solidity
  function toUInt(
    int128 x
  ) internal returns (uint64)
```
Convert signed 64.64 fixed point number into unsigned 64-bit integer
number rounding down.  Revert on underflow.



#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`x` | int128 | signed 64.64-bit fixed point number

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`unsigned`| uint64 | 64-bit integer number
### ln
```solidity
  function ln(
  ) internal returns (int128)
```




