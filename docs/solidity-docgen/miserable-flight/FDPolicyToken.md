ERC721 policy token
        Can get a long string form of the tokenURI
        When the ownership is transferred, it will update the status in policyFlow


## Functions
### tokenURI
```solidity
  function tokenURI(
    uint256 _tokenId
  ) public returns (string)
```
Get the tokenURI of a policy


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_tokenId` | uint256 | Token Id of the policy token

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`The`| string | tokenURI in string form
### updatePolicyFlow
```solidity
  function updatePolicyFlow(
  ) external
```
Update the policyFlow address if it has been updated
       @param _policyFlow New policyFlow contract address



### mintPolicyToken
```solidity
  function mintPolicyToken(
    address _to
  ) public
```
Mint a new policy token to an address


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_to` | address | The receiver address

### transferOwner
```solidity
  function transferOwner(
    address _from,
    address _to,
    uint256 _tokenId
  ) public
```
Transfer the owner of a policy token and update the information in policyFlow

Need approval and is prepared for secondary market
If you just transfer the policy token, you will not transfer the right for claiming payoff

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_from` | address | The original owner of the policy
|`_to` | address | The new owner of the policy
|`_tokenId` | uint256 | Token id of the policy

### _getTokenURI
```solidity
  function _getTokenURI(
    uint256 _tokenId
  ) internal returns (string)
```
Get the tokenURI, the metadata is from policyFlow contract


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_tokenId` | uint256 | Token Id of the policy token

### _constructTokenURI
```solidity
  function _constructTokenURI(
    struct FDPolicyToken.PolicyTokenURIParam _params
  ) internal returns (string)
```
Construct the metadata of a specific policy token


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_params` | struct FDPolicyToken.PolicyTokenURIParam | The parameters of the policy token

## Events
### PolicyFlowUpdated
```solidity
  event PolicyFlowUpdated(
  )
```



