
Contract module which allows children to implement an emergency stop
mechanism that can be triggered by an authorized account.

This module is used through inheritance. It will make available the
modifiers `whenNotPaused` and `whenPaused`, which can be applied to
the functions of your contract. Note that they will not be pausable by
simply including this module, only once the modifiers are put in place.

## Functions
### constructor
```solidity
  function constructor(
  ) internal
```

Initializes the contract in unpaused state.


### paused
```solidity
  function paused(
  ) public returns (bool)
```

Returns true if the contract is paused, and false otherwise.


### _pause
```solidity
  function _pause(
  ) internal
```

Triggers stopped state.

Requirements:

- The contract must not be paused.


### _unpause
```solidity
  function _unpause(
  ) internal
```

Returns to normal state.

Requirements:

- The contract must be paused.


## Events
### Paused
```solidity
  event Paused(
  )
```

Emitted when the pause is triggered by `account`.

### Unpaused
```solidity
  event Unpaused(
  )
```

Emitted when the pause is lifted by `account`.

