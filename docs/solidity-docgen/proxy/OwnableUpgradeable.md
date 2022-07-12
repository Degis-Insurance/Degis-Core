
Contract module which provides a basic access control mechanism, where
there is an account (an owner) that can be granted exclusive access to
specific functions.

By default, the owner account will be the one that deploys the contract. This
can later be changed with {transferOwnership}.

This module is used through inheritance. It will make available the modifier
`onlyOwner`, which can be applied to your functions to restrict their use to
the owner.

## Functions
### __Ownable_init
```solidity
  function __Ownable_init(
  ) internal
```

Initializes the contract setting the deployer as the initial owner.


### __Ownable_init_unchained
```solidity
  function __Ownable_init_unchained(
  ) internal
```




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

NOTE: Renouncing ownership will leave the contract without an owner,
thereby removing any functionality that is only available to the owner.


### transferOwnership
```solidity
  function transferOwnership(
  ) public
```

Transfers ownership of the contract to a new account (`newOwner`).
Can only be called by the current owner.


### _transferOwnership
```solidity
  function _transferOwnership(
  ) internal
```

Transfers ownership of the contract to a new account (`newOwner`).
Internal function without access restriction.


## Events
### OwnershipTransferred
```solidity
  event OwnershipTransferred(
  )
```



