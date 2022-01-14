This is the contract for token price policy token.
        It is a ERC20 token with an owner and a minter.
        The owner should be the deployer at first.
        The minter should be the policyCore contract.

   It is different from the flight delay token.
        That is an ERC721 NFT and this is an ERC20 token.

## Functions
### constructor
```solidity
  function constructor(
  ) public
```




### mint
```solidity
  function mint(
    address _account,
    uint256 _amount
  ) public
```
Mint some policy tokens


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_account` | address | Address to receive the tokens
|`_amount` | uint256 | Amount to be minted

### burn
```solidity
  function burn(
    address _account,
    uint256 _amount
  ) public
```
Burn some policy tokens


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_account` | address | Address to burn tokens
|`_amount` | uint256 | Amount to be burned

## Events
### Mint
```solidity
  event Mint(
  )
```



### Burn
```solidity
  event Burn(
  )
```



