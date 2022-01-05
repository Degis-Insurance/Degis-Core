This is contract used for ERC20 tokens that has multiple minters and burners.
        It has basic implementations for ERC20 and also the owner control.
        Even if the owner is renounced to zero address, the token can still be minted/burned.
        DegisToken and BuyerToken are both this kind ERC20 token.


## Functions
### constructor
```solidity
  function constructor(
  ) public
```




### getMinterList
```solidity
  function getMinterList(
  ) external returns (address[])
```




### addMinter
```solidity
  function addMinter(
    address _newMinter
  ) external
```
Add a new minter into the minterList


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_newMinter` | address | Address of the new minter

### removeMinter
```solidity
  function removeMinter(
    address _oldMinter
  ) external
```
Remove a minter from the minterList


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_oldMinter` | address | Address of the minter to be removed

### addBurner
```solidity
  function addBurner(
    address _newBurner
  ) external
```
Add a new burner into the burnerList


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_newBurner` | address | Address of the new burner

### removeBurner
```solidity
  function removeBurner(
    address _oldBurner
  ) external
```
Remove a minter from the minterList


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_oldBurner` | address | Address of the minter to be removed

### mint
```solidity
  function mint(
    address _account,
    uint256 _amount
  ) internal
```
Mint tokens


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_account` | address | Receiver's address
|`_amount` | uint256 | Amount to be minted

### burn
```solidity
  function burn(
    address _account,
    uint256 _amount
  ) internal
```
Burn tokens


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_account` | address | address
|`_amount` | uint256 | amount to be burned

### _addMinter
```solidity
  function _addMinter(
  ) internal
```
Finish the process of adding a new minter.

   Also used in constructor.


## Events
### MinterAdded
```solidity
  event MinterAdded(
  )
```



### MinterRemoved
```solidity
  event MinterRemoved(
  )
```



### BurnerAdded
```solidity
  event BurnerAdded(
  )
```



### BurnerRemoved
```solidity
  event BurnerRemoved(
  )
```



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



