Modified version of ERC20Upgradeable where transfers and allowances are disabled.

only minting and burning are allowed. The hook _afterTokenOperation is called after Minting and Burning.

## Functions
### __ERC20_init
```solidity
  function __ERC20_init(
  ) internal
```

Sets the values for {name} and {symbol}.

The default value of {decimals} is 18. To select a different value for
{decimals} you should overload it.

All two of these values are immutable: they can only be set once during
construction.


### __ERC20_init_unchained
```solidity
  function __ERC20_init_unchained(
  ) internal
```




### name
```solidity
  function name(
  ) public returns (string)
```

Returns the name of the token.


### symbol
```solidity
  function symbol(
  ) public returns (string)
```

Returns the symbol of the token, usually a shorter version of the
name.


### decimals
```solidity
  function decimals(
  ) public returns (uint8)
```

Returns the number of decimals used to get its user representation.
For example, if `decimals` equals `2`, a balance of `505` tokens should
be displayed to a user as `5.05` (`505 / 10 ** 2`).

Tokens usually opt for a value of 18, imitating the relationship between
Ether and Wei. This is the value {ERC20} uses, unless this function is
overridden;

NOTE: This information is only used for _display_ purposes: it in
no way affects any of the arithmetic of the contract, including
{IERC20-balanceOf} and {IERC20-transfer}.


### totalSupply
```solidity
  function totalSupply(
  ) public returns (uint256)
```

See {IERC20-totalSupply}.


### balanceOf
```solidity
  function balanceOf(
  ) public returns (uint256)
```

See {IERC20-balanceOf}.


### _mint
```solidity
  function _mint(
  ) internal
```

Creates `amount` tokens and assigns them to `account`, increasing
the total supply.

Emits a {Transfer} event with `from` set to the zero address.

Requirements:

- `account` cannot be the zero address.


### _burn
```solidity
  function _burn(
  ) internal
```

Destroys `amount` tokens from `account`, reducing the
total supply.

Emits a {Transfer} event with `to` set to the zero address.

Requirements:

- `account` cannot be the zero address.
- `account` must have at least `amount` tokens.


### _beforeTokenTransfer
```solidity
  function _beforeTokenTransfer(
  ) internal
```

Hook that is called before any transfer of tokens. This includes
minting and burning.

Calling conditions:

- when `from` and `to` are both non-zero, `amount` of ``from``'s tokens
will be transferred to `to`.
- when `from` is zero, `amount` tokens will be minted for `to`.
- when `to` is zero, `amount` of ``from``'s tokens will be burned.
- `from` and `to` are never both zero.

To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].


### _afterTokenOperation
```solidity
  function _afterTokenOperation(
    address account,
    uint256 newBalance
  ) internal
```

Hook that is called after any minting and burning.

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`account` | address | the account being affected
|`newBalance` | uint256 | newBalance after operation

## Events
### Burn
```solidity
  event Burn(
  )
```

Emitted when `value` tokens are burned and minted

### Mint
```solidity
  event Mint(
  )
```



