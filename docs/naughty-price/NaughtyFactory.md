
Factory contract to deploy new pools periodically
     Each pool(product) will have a unique naughtyId
     Each pool will have its pool token
     PolicyToken - Stablecoin
     Token 0 may change but Token 1 is always stablecoin.

## Functions
### getLatestTokenAddress
```solidity
  function getLatestTokenAddress(
  ) external returns (address)
```
Next token to be deployed



#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`Latest`| address | token address
### getInitCodeHashForPolicyToken
```solidity
  function getInitCodeHashForPolicyToken(
    string _policyTokenName
  ) external returns (bytes32)
```
Get the INIT_CODE_HASH for policy tokens with parameters


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyTokenName` | string | Name of the policy token to be deployed

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
    address Address
  ) external
```
Remember to call this function to set the policyCore address
        < PolicyCore should be the owner of policyToken >


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`Address` | address | of policyCore contract

### deployPool
```solidity
  function deployPool(
    address _policyTokenAddress,
    address _stablecoin,
    uint256 _deadline,
    uint256 _feeRate
  ) external returns (address)
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
|`Address`| address | of the pool
### deployPolicyToken
```solidity
  function deployPolicyToken(
    string _policyTokenName
  ) public returns (address)
```
For each round we need to first create the policytoken(ERC20)


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_policyTokenName` | string | Name of the policyToken

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`PolicyToken`| address | address
### _deploy
```solidity
  function _deploy(
  ) internal returns (address addr)
```
Deploy function with create2



### getPolicyTokenBytecode
```solidity
  function getPolicyTokenBytecode(
    string _tokenName
  ) public returns (bytes)
```
Get the policyToken bytecode (with parameters)


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_tokenName` | string | Name of policyToken

