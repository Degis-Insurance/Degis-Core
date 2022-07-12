This is the contract for getting price feed from DEX
        IDO projects does not have Chainlink feeds so we use DEX TWAP price as oracle

        Workflow:
        1. Deploy naughty token for the IDO project and set its type as "IDO"
        2. Add ido price feed info by calling "addIDOPair" function
        3. Set auto tasks start within PERIOD to endTime to sample prices from DEX
        4. Call "settleFinalResult" function in core to settle the final price


## Functions
### initialize
```solidity
  function initialize(
  ) public
```




### addIDOPair
```solidity
  function addIDOPair(
  ) external
```




### setPrice
```solidity
  function setPrice(
  ) external
```




### samplePrice
```solidity
  function samplePrice(
  ) external
```




### getLatestPrice
```solidity
  function getLatestPrice(
    string _policyToken
  ) external returns (uint256 price)
```
Get latest price



#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyToken` | string | Policy token name


#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`price`| uint256 | USD price of the base token
## Events
### SamplePrice
```solidity
  event SamplePrice(
  )
```



### NewIDOPair
```solidity
  event NewIDOPair(
  )
```



