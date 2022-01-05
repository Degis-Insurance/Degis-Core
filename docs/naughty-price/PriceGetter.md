This is the contract for getting price feed from chainlink.
        The contract will keep a record from tokenName => priceFeed Address.
        Got the sponsorship and collaboration with Chainlink.

   The price from chainlink priceFeed has different decimals, be careful.

## Functions
### constructor
```solidity
  function constructor(
  ) public
```
Constructor function, initialize some price feed



### setPriceFeed
```solidity
  function setPriceFeed(
    string _tokenName,
    address _feedAddress,
    uint256 _decimals
  ) public
```
Set a price feed oracle address for a token


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_tokenName` | string | Address of the token
|`_feedAddress` | address | Price feed oracle address
|`_decimals` | uint256 | Decimals of this price feed service

### getLatestPrice
```solidity
  function getLatestPrice(
    string _tokenName
  ) public returns (uint256)
```
Get latest price of a token


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_tokenName` | string | Address of the token

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`price`| uint256 | The latest price
## Events
### PriceFeedChanged
```solidity
  event PriceFeedChanged(
  )
```



### LatestPriceGet
```solidity
  event LatestPriceGet(
  )
```



