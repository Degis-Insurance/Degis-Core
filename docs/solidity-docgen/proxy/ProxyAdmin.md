
This is an auxiliary contract meant to be assigned as the admin of a {TransparentUpgradeableProxy}. For an
explanation of why you would want to use this see the documentation for {TransparentUpgradeableProxy}.

## Functions
### getProxyImplementation
```solidity
  function getProxyImplementation(
  ) public returns (address)
```

Returns the current implementation of `proxy`.

Requirements:

- This contract must be the admin of `proxy`.


### getProxyAdmin
```solidity
  function getProxyAdmin(
  ) public returns (address)
```

Returns the current admin of `proxy`.

Requirements:

- This contract must be the admin of `proxy`.


### changeProxyAdmin
```solidity
  function changeProxyAdmin(
  ) public
```

Changes the admin of `proxy` to `newAdmin`.

Requirements:

- This contract must be the current admin of `proxy`.


### upgrade
```solidity
  function upgrade(
  ) public
```

Upgrades `proxy` to `implementation`. See {TransparentUpgradeableProxy-upgradeTo}.

Requirements:

- This contract must be the admin of `proxy`.


### upgradeAndCall
```solidity
  function upgradeAndCall(
  ) public
```

Upgrades `proxy` to `implementation` and calls a function on the new implementation. See
{TransparentUpgradeableProxy-upgradeToAndCall}.

Requirements:

- This contract must be the admin of `proxy`.


