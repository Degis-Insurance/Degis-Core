DegisToken inherits from ERC20 Permit which contains the basic ERC20 implementation.
        DegisToken can use the permit function rather than approve + transferFrom.

        DegisToken has an owner, a minterList and a burnerList.
        When lauched on mainnet, the owner may be removed or tranferred to a multisig.
        By default, the owner & the first minter will be the one that deploys the contract.
        The minterList should contain FarmingPool and PurchaseIncentiveVault.
        The burnerList should contain EmergencyPool.


## Functions
### mintDegis
```solidity
  function mintDegis(
    address _account,
    uint256 _amount
  ) external
```
Mint degis tokens


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_account` | address | Receiver's address
|`_amount` | uint256 | Amount to be minted

### burnDegis
```solidity
  function burnDegis(
    address _account,
    uint256 _amount
  ) external
```
Burn degis tokens


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_account` | address | Receiver's address
|`_amount` | uint256 | Amount to be burned

