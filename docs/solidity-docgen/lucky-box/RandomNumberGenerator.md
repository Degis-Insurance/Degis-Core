


## Functions
### constructor
```solidity
  function constructor(
    address _vrfCoordinator,
    address _linkToken
  ) public
```
Constructor

RandomNumberGenerator must be deployed before the lottery.
Once the lottery contract is deployed, setLotteryAddress must be called.
https://docs.chain.link/docs/vrf-contracts/

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_vrfCoordinator` | address | address of the VRF coordinator
|`_linkToken` | address | address of the LINK token

### setFee
```solidity
  function setFee(
    uint256 _fee
  ) external
```
Change the fee


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_fee` | uint256 | new fee (in LINK)

### setKeyHash
```solidity
  function setKeyHash(
    bytes32 _keyHash
  ) external
```
Change the keyHash


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_keyHash` | bytes32 | new keyHash

### setLotteryAddress
```solidity
  function setLotteryAddress(
    address _degisLottery
  ) external
```
Set the address for the DegisLottery


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_degisLottery` | address | address of the PancakeSwap lottery

### withdrawTokens
```solidity
  function withdrawTokens(
    address _tokenAddress,
    uint256 _tokenAmount
  ) external
```
It allows the admin to withdraw tokens sent to the contract

Only callable by owner.
#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_tokenAddress` | address | the address of the token to withdraw
|`_tokenAmount` | uint256 | the number of token amount to withdraw


### getRandomNumber
```solidity
  function getRandomNumber(
  ) external
```
Request randomness from Chainlink VRF



### _rand
```solidity
  function _rand(
  ) internal returns (uint256)
```




### fulfillRandomness
```solidity
  function fulfillRandomness(
  ) internal
```
Callback function used by ChainLink's VRF Coordinator



