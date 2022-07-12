


## Functions
### constructor
```solidity
  function constructor(
    address _DEGTokenAddress,
    address _USDTokenAddress,
    address _randomGeneratorAddress
  ) public
```
Constructor function

RandomNumberGenerator must be deployed prior to this contract

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_DEGTokenAddress` | address | Address of the DEG token (for buying tickets)
|`_USDTokenAddress` | address | Address of the USD token (for prize distribution)
|`_randomGeneratorAddress` | address | Address of the RandomGenerator contract used to work with ChainLink VRF

### getCurrentRoundWeight
```solidity
  function getCurrentRoundWeight(
  ) public returns (uint256)
```




### getPoolTicketsInfo
```solidity
  function getPoolTicketsInfo(
    uint256 _startIndex,
    uint256 _stopIndex,
    uint256 _position
  ) external returns (uint256[], uint256[], uint256[])
```
Get pool tickets info

May be a huge number, avoid reading this frequently

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_startIndex` | uint256 | Start number
|`_stopIndex` | uint256 | Stop number
|`_position` | uint256 | Which level to check (0, 1, 2, 3), use 0 to check the 4-digit number

### getUserTicketsInfo
```solidity
  function getUserTicketsInfo(
  ) external returns (uint256[], uint256[], uint256[])
```
Get user tickets info



### getLotteriesStageInfo
```solidity
  function getLotteriesStageInfo(
  ) external returns (uint256[] stageProportion, uint256[] stageReward, uint256[] stageAmount, uint256[] stageWeight)
```
Get lottery stage info



### setOperatorAddress
```solidity
  function setOperatorAddress(
    address _operatorAddress
  ) external
```
Set operator address

Only callable by the owner

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_operatorAddress` | address | address of the operator

### setRandomNumberGenerator
```solidity
  function setRandomNumberGenerator(
    address _randomNumberGenerator
  ) external
```
Set Random Number Generator contract address

Only callable by the owner

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_randomNumberGenerator` | address | Address of the Random Number Generator contract

### setEndTime
```solidity
  function setEndTime(
    uint256 _endTime
  ) external
```
Change the end time of current round (only if it was set a wrong number)

Normally this function is not needed

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_endTime` | uint256 | New end time

### startLottery
```solidity
  function startLottery(
    uint256 _endTime,
    uint256[4] _stageProportion
  ) external
```
Start the lottery

Callable only by operator
Stage proportion must sum to 10,000(100 <=> 1)
#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_endTime` | uint256 | EndTime of the lottery (UNIX timestamp in s)
|`_stageProportion` | uint256[4] | Breakdown of rewards per bracket


### closeLottery
```solidity
  function closeLottery(
  ) external
```
Close a lottery

Callable by any address and need to meet the endtime condition
Normally it's automatically called by our contract


### buyTickets
```solidity
  function buyTickets(
    uint256[] _ticketNumbers,
    uint256[] _ticketAmounts
  ) external
```
Buy tickets for the current lottery round

Can not be called by a smart contract

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_ticketNumbers` | uint256[] | array of ticket numbers between 0 and 9999
|`_ticketAmounts` | uint256[] | array of ticket amount

### redeemTickets
```solidity
  function redeemTickets(
    uint256[] _ticketNumbers
  ) external
```
Redeem tickets for all lottery

Callable by users
#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_ticketNumbers` | uint256[] | Array of ticket numbers


### updateBalance
```solidity
  function updateBalance(
  ) public
```




### drawLottery
```solidity
  function drawLottery(
  ) external
```
Draw the final number, calculate reward in DEG for each group,
        and make this lottery claimable (need to wait for the random generator)

Callable by any address


### pendingReward
```solidity
  function pendingReward(
    uint256 _lotteryId,
    address user
  ) public returns (uint256 reward)
```
Receive award from a lottery


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_lotteryId` | uint256 | lottery id
|`user` | address | user address

### receiveRewards
```solidity
  function receiveRewards(
    uint256 _lotteryId
  ) public
```
Receive all awards from lottery before lottery id

Callable by users only, not contract!
#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_lotteryId` | uint256 | lottery id


### recoverWrongTokens
```solidity
  function recoverWrongTokens(
    address _tokenAddress,
    uint256 _tokenAmount
  ) external
```
Recover wrong tokens sent to the contract

   Only callable by the owner
   All tokens except DEG and USD are wrong tokens

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_tokenAddress` | address | the address of the token to withdraw
|`_tokenAmount` | uint256 | token amount to withdraw

### _buyTicket
```solidity
  function _buyTicket(
    struct DegisLottery.Tickets tickets,
    uint256 _ticketNumber,
    uint256 _ticketAmount,
    uint256 _ticketWeight
  ) internal
```
Update the status to finish buying a ticket


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`tickets` | struct DegisLottery.Tickets | Tickets to update
|`_ticketNumber` | uint256 | Original number of the ticket
|`_ticketAmount` | uint256 | Amount of this number are being bought
|`_ticketWeight` | uint256 | Weight of this ticket, depends on round

### _redeemTicket
```solidity
  function _redeemTicket(
    struct DegisLottery.Tickets tickets,
    uint256 _ticketNumber,
    uint256 _ticketAmount,
    uint256 _ticketWeight
  ) internal
```
Update the status to finish redeeming a ticket


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`tickets` | struct DegisLottery.Tickets | Tickets to update
|`_ticketNumber` | uint256 | Original number of the ticket
|`_ticketAmount` | uint256 | Amount of this number are being redeemed
|`_ticketWeight` | uint256 | Weight of this ticket, depends on round

### _encodeNumber
```solidity
  function _encodeNumber(
    uint256 _number,
    uint256 _position
  ) internal returns (uint256)
```
Get the encoded number form


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_number` | uint256 | The original number
|`_position` | uint256 | The number's position/level (0, 1, 2, 3)

### _isContract
```solidity
  function _isContract(
  ) internal returns (bool)
```
Check if an address is a contract



### _viewUserTicketAmount
```solidity
  function _viewUserTicketAmount(
  ) internal returns (uint256)
```




### _viewUserTicketWeight
```solidity
  function _viewUserTicketWeight(
  ) internal returns (uint256)
```




### viewUserAllTicketsInfo
```solidity
  function viewUserAllTicketsInfo(
  ) external returns (uint256[], uint256[], uint256[], uint256)
```




### viewUserRewardsInfo
```solidity
  function viewUserRewardsInfo(
  ) external returns (uint256[], uint256[], uint256[])
```




## Events
### TicketsPurchase
```solidity
  event TicketsPurchase(
  )
```



### TicketsRedeem
```solidity
  event TicketsRedeem(
  )
```



### LotteryOpen
```solidity
  event LotteryOpen(
  )
```



### LotteryNumberDrawn
```solidity
  event LotteryNumberDrawn(
  )
```



### ReceiveRewards
```solidity
  event ReceiveRewards(
  )
```



### LotteryClose
```solidity
  event LotteryClose(
  )
```



### LotteryFundInjection
```solidity
  event LotteryFundInjection(
  )
```



### RandomNumberGeneratorChanged
```solidity
  event RandomNumberGeneratorChanged(
  )
```



### OperatorAddressChanged
```solidity
  event OperatorAddressChanged(
  )
```



### AdminTokenRecovery
```solidity
  event AdminTokenRecovery(
  )
```



### UpdateBalance
```solidity
  event UpdateBalance(
  )
```



