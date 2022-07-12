
Factory contract to deploy new pools periodically
     Each pool(product) will have a unique naughtyId
     Each pool will have its pool token
     PolicyToken - Stablecoin
     Token 0 may change but Token 1 is always stablecoin.

## Functions
### initialize
```solidity
  function initialize(
  ) public
```




### getAllTokens
```solidity
  function getAllTokens(
  ) external returns (address[])
```
Get the all tokens that have been deployed



#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`tokens`| address[] | All tokens
### getInitCodeHashForPolicyToken
```solidity
  function getInitCodeHashForPolicyToken(
    string _tokenName,
    uint256 _decimals
  ) public returns (bytes32)
```
Get the INIT_CODE_HASH for policy tokens with parameters

For test/task convinience, pre-compute the address
     Ethers.js:
     Address = ethers.utils.getCreate2Address(factory address, salt, INIT_CODE_HASH)
     salt = keccak256(abi.encodePacked(_policyTokenName))

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_tokenName` | string | Name of the policy token to be deployed
|`_decimals` | uint256 | Token decimals of this policy token

### getPairAddress
```solidity
  function getPairAddress(
    address _tokenAddress1,
    address _tokenAddress2
  ) public returns (address)
```
Get the pair address deployed by the factory
        PolicyToken address first, and then stablecoin address
        The order of the tokens will be sorted inside the function


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_tokenAddress1` | address | Address of token1
|`_tokenAddress2` | address | Address of toekn2

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`Pool`| address | address of the two tokens
### setPolicyCoreAddress
```solidity
  function setPolicyCoreAddress(
    address _policyCore
  ) external
```
Remember to call this function to set the policyCore address

   Only callable by the owner
        < PolicyCore should be the minter of policyToken >
        < This process is done inside constructor >

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyCore` | address | Address of policyCore contract

### setIncomeMakerProportion
```solidity
  function setIncomeMakerProportion(
    uint256 _proportion
  ) external
```
Set income maker proportion

   Only callable by the owner

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_proportion` | uint256 | New proportion to income maker contract

### setIncomeMakerAddress
```solidity
  function setIncomeMakerAddress(
    address _incomeMaker
  ) external
```
Set income maker address

Only callable by the owner

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_incomeMaker` | address | New income maker address

### deployPolicyToken
```solidity
  function deployPolicyToken(
    string _policyTokenName,
    uint256 _decimals
  ) external returns (address)
```
For each round we need to first create the policytoken(ERC20)


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyTokenName` | string | Name of the policyToken
|`_decimals` | uint256 | Decimals of the policyToken

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`tokenAddress`| address | PolicyToken address
### deployPool
```solidity
  function deployPool(
    address _policyTokenAddress,
    address _stablecoin,
    uint256 _deadline,
    uint256 _feeRate
  ) public returns (address)
```
After deploy the policytoken and get the address,
        we deploy the policyToken - stablecoin pool contract


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyTokenAddress` | address | Address of policy token
|`_stablecoin` | address | Address of the stable coin
|`_deadline` | uint256 | Deadline of the pool
|`_feeRate` | uint256 | Fee rate given to LP holders

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`poolAddress`| address | Address of the pool
### _deploy
```solidity
  function _deploy(
    bytes code,
    bytes32 salt
  ) internal returns (address addr)
```
Deploy function with create2


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`code` | bytes | Byte code of the contract (creation code)
|`salt` | bytes32 | Salt for the deployment

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`addr`| address | The deployed contract address
### _getPolicyTokenBytecode
```solidity
  function _getPolicyTokenBytecode(
    string _tokenName,
    uint256 _decimals
  ) internal returns (bytes)
```
Get the policyToken bytecode (with constructor parameters)


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_tokenName` | string | Name of policyToken
|`_decimals` | uint256 | Decimals of policyToken

## Events
### PolicyCoreAddressChanged
```solidity
  event PolicyCoreAddressChanged(
  )
```



### IncomeMakerProportionChanged
```solidity
  event IncomeMakerProportionChanged(
  )
```



### IncomeMakerAddressChanged
```solidity
  event IncomeMakerAddressChanged(
  )
```



