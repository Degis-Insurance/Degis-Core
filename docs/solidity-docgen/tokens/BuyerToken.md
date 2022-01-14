Buyer tokens are distributed to buyers corresponding to the usd value they spend.
        Users can deposit their buyer tokens into purchaseIncentiveVault.
        Periodical reward will be given to the participants in purchaseIncentiveVault.
        When distributing purchase incentive reward, the buyer tokens will be burned.

   Need to set the correct minters and burners when reploying this contract.

## Functions
### mintBuyerToken
```solidity
  function mintBuyerToken(
    address _account,
    uint256 _amount
  ) external
```
Mint buyer tokens


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_account` | address | Receiver's address
|`_amount` | uint256 | Amount to be minted

### burnBuyerToken
```solidity
  function burnBuyerToken(
    address _account,
    uint256 _amount
  ) external
```
Burn buyer tokens


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_account` | address | Receiver's address
|`_amount` | uint256 | Amount to be burned

