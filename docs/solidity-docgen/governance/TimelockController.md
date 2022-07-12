
Contract module which acts as a timelocked controller. When set as the
owner of an `Ownable` smart contract, it enforces a timelock on all
`onlyOwner` maintenance operations. This gives time for users of the
controlled contract to exit before a potentially dangerous maintenance
operation is applied.

By default, this contract is self administered, meaning administration tasks
have to go through the timelock process. The proposer (resp executor) role
is in charge of proposing (resp executing) operations. A common use case is
to position this {TimelockController} as the owner of a smart contract, with
a multisig or a DAO as the sole proposer.

_Available since v3.3._

## Functions
### constructor
```solidity
  function constructor(
  ) public
```

Initializes the contract with a given `minDelay`.


### receive
```solidity
  function receive(
  ) external
```

Contract might receive/hold ETH as part of the maintenance process.


### isOperation
```solidity
  function isOperation(
  ) public returns (bool pending)
```

Returns whether an id correspond to a registered operation. This
includes both Pending, Ready and Done operations.


### isOperationPending
```solidity
  function isOperationPending(
  ) public returns (bool pending)
```

Returns whether an operation is pending or not.


### isOperationReady
```solidity
  function isOperationReady(
  ) public returns (bool ready)
```

Returns whether an operation is ready or not.


### isOperationDone
```solidity
  function isOperationDone(
  ) public returns (bool done)
```

Returns whether an operation is done or not.


### getTimestamp
```solidity
  function getTimestamp(
  ) public returns (uint256 timestamp)
```

Returns the timestamp at with an operation becomes ready (0 for
unset operations, 1 for done operations).


### getMinDelay
```solidity
  function getMinDelay(
  ) public returns (uint256 duration)
```

Returns the minimum delay for an operation to become valid.

This value can be changed by executing an operation that calls `updateDelay`.


### hashOperation
```solidity
  function hashOperation(
  ) public returns (bytes32 hash)
```

Returns the identifier of an operation containing a single
transaction.


### hashOperationBatch
```solidity
  function hashOperationBatch(
  ) public returns (bytes32 hash)
```

Returns the identifier of an operation containing a batch of
transactions.


### schedule
```solidity
  function schedule(
  ) public
```

Schedule an operation containing a single transaction.

Emits a {CallScheduled} event.

Requirements:

- the caller must have the 'proposer' role.


### scheduleBatch
```solidity
  function scheduleBatch(
  ) public
```

Schedule an operation containing a batch of transactions.

Emits one {CallScheduled} event per transaction in the batch.

Requirements:

- the caller must have the 'proposer' role.


### cancel
```solidity
  function cancel(
  ) public
```

Cancel an operation.

Requirements:

- the caller must have the 'proposer' role.


### execute
```solidity
  function execute(
  ) public
```

Execute an (ready) operation containing a single transaction.

Emits a {CallExecuted} event.

Requirements:

- the caller must have the 'executor' role.


### executeBatch
```solidity
  function executeBatch(
  ) public
```

Execute an (ready) operation containing a batch of transactions.

Emits one {CallExecuted} event per transaction in the batch.

Requirements:

- the caller must have the 'executor' role.


### updateDelay
```solidity
  function updateDelay(
  ) external
```

Changes the minimum timelock duration for future operations.

Emits a {MinDelayChange} event.

Requirements:

- the caller must be the timelock itself. This can only be achieved by scheduling and later executing
an operation where the timelock is the target and the data is the ABI-encoded call to this function.


## Events
### CallScheduled
```solidity
  event CallScheduled(
  )
```

Emitted when a call is scheduled as part of operation `id`.

### CallExecuted
```solidity
  event CallExecuted(
  )
```

Emitted when a call is performed as part of operation `id`.

### Cancelled
```solidity
  event Cancelled(
  )
```

Emitted when operation `id` is cancelled.

### MinDelayChange
```solidity
  event MinDelayChange(
  )
```

Emitted when the minimum delay for future operations is modified.

