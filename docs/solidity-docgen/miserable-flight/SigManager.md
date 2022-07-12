Signature is used when submitting new applications.
        The premium should be decided by the pricing model and be signed by a private key.
        Other submissions will not be accepted.
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

### checkSignature
```solidity
  function checkSignature(
    bytes signature,
    string _flightNumber,
    uint256 _departureTimestamp,
    uint256 _landingDate,
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
|`_departureTimestamp` | uint256 | Flight departure timestamp
|`_landingDate` | uint256 | Flight landing date
|`_user` | address | User address
|`_premium` | uint256 | Policy premium
|`_deadline` | uint256 | Deadline of a this signature

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



