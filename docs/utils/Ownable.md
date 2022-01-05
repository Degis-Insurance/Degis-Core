


## Functions
### constructor
```solidity
  function constructor(
  ) internal
```

Initializes the contract setting the deployer as the initial owner.


### owner
```solidity
  function owner(
  ) public returns (address)
```
Returns the address of the current owner.



### renounceOwnership
```solidity
  function renounceOwnership(
  ) public
```
Leaves the contract without owner. It will not be possible to call
        `onlyOwner` functions anymore. Can only be called by the current owner.


   Renouncing ownership will leave the contract without an owner,
        thereby removing any functionality that is only available to the owner.


### transferOwnership
```solidity
  function transferOwnership(
    address newOwner
  ) public
```
Transfers ownership of the contract to a new account (`newOwner`).

   Can only be called by the current owner.

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`newOwner` | address | Address of the new owner

### _transferOwnership
```solidity
  function _transferOwnership(
    address newOwner
  ) internal
```
Transfers ownership of the contract to a new account (`newOwner`).

   Internal function without access restriction.

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`newOwner` | address | Address of the new owner

## Events
### OwnershipTransferred
```solidity
  event OwnershipTransferred(
  )
```



