Signature is used when submitting new applications.
        The premium should be decided by the pricing model and be signed by a private key.
        Other submission will not be accepted.
        Please keep the signer key safe.


## Functions
### addSigner
```solidity
  function addSigner(
    address _newSigner
  ) external
```
Add a signer into valid signer list


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_newSigner` | address | The new signer address

### removeSigner
```solidity
  function removeSigner(
    address _oldSigner
  ) external
```
Remove a signer from the valid signer list


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_oldSigner` | address | The old signer address to be removed

### isValidSigner
```solidity
  function isValidSigner(
    address _address
  ) public returns (bool)
```
Check whether the address is a valid signer


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_address` | address | The input address

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`isValidSigner`| bool | Whether this address is
### checkSignature
```solidity
  function checkSignature(
    bytes signature,
    string _flightNumber,
    address _user,
    uint256 _premium,
    uint256 _deadline
  ) external
```
Check signature when buying a new policy (avoid arbitrary premium amount)


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`signature` | bytes | 65 bytes array: [[v (1)], [r (32)], [s (32)]]
|`_flightNumber` | string | Flight number
|`_user` | address | User address
|`_premium` | uint256 | Policy premium
|`_deadline` | uint256 | Deadline of a policy

## Events
### SignerAdded
```solidity
  event SignerAdded(
  )
```



### SignerRemoved
```solidity
  event SignerRemoved(
  )
```



