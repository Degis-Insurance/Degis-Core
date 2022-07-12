


## Functions
### setResult
```solidity
  function setResult(
  ) public
```

For test, you can set the result you want


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



