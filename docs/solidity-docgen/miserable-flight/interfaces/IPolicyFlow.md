This is the interface of PolicyFlow contract.
        Contains some type definations, event list and function declarations.


## Functions
### newApplication
```solidity
  function newApplication(
  ) external returns (uint256 policyId)
```
Apply for a new policy



### newClaimRequest
```solidity
  function newClaimRequest(
  ) external
```
Start a new claim request



### viewUserPolicy
```solidity
  function viewUserPolicy(
  ) external returns (struct IPolicyStruct.PolicyInfo[])
```
View a user's policy info



### getPolicyInfoById
```solidity
  function getPolicyInfoById(
  ) external returns (struct IPolicyStruct.PolicyInfo)
```
Get the policy info by its policyId



### policyOwnerTransfer
```solidity
  function policyOwnerTransfer(
  ) external
```
Update when the policy token is transferred to another owner



### finalSettlement
```solidity
  function finalSettlement(
  ) external
```
Do the final settlement when receiving the oracle result



