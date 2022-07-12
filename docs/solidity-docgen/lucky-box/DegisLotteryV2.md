
This lottery uses DEG as tickets and DEG as rewards also
     Users can pay 10 DEG to buy one ticket and choose four digits for each ticket
     After the lottery was closed, it will draw a final random number through Chainlink VRF
     Users get rewards according to the how many numbers they matched with the final number

     Reward distribution:
     80% of each round prize pool will be distributed to the winners (breakdowns for different levels)
     20% of each round prize pool will be rolled to next round (except for treasury fee)


## Functions
### initialize
```solidity
  function initialize(
    address _degis,
    address _randomGenerator
  ) public
```
Initialize function


RandomNumberGenerator must be deployed prior to this contract


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_degis` | address |           Address of DEG
|`_randomGenerator` | address | Address of the RandomGenerator contract used to work with ChainLink VRF

### viewWalletTicketIds
```solidity
  function viewWalletTicketIds(
    address _wallet
  ) external returns (uint256[])
```
Get the reward per ticket in 4 brackets



#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_wallet` | address | address to check owned tickets


#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`_lotteryId`| uint256[] | lottery id to verify ownership
### viewAllLottery
```solidity
  function viewAllLottery(
    uint256 _startId,
    uint256 _endId
  ) external returns (struct DegisLotteryV2.Lottery[])
```
View lottery information



#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_startId` | uint256 | Start lottery id
|`_endId` | uint256 | End lottery id


#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`Array`| struct DegisLotteryV2.Lottery[] | of lottery information
### viewNumbersPerTicketId
```solidity
  function viewNumbersPerTicketId(
    uint256[] array
  ) external returns (uint32[])
```
View ticker statuses and numbers for an array of ticket ids


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`array` | uint256[] | of _ticketId

### viewRewardsForTicketId
```solidity
  function viewRewardsForTicketId(
    uint256 _lotteryId,
    uint256 _ticketId
  ) public returns (uint256)
```
View rewards for a given ticket in a given lottery round


This function will help to find the highest prize bracket
     But this computation is encouraged to be done off-chain
     Better to get bracket first and then call "_calculateRewardsForTicketId()"


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_lotteryId` | uint256 | Lottery round
|`_ticketId` | uint256 |  Ticket id


#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`reward`| uint256 | Ticket reward
### viewUserRewards
```solidity
  function viewUserRewards(
    address _user,
    uint256 _startRound,
    uint256 _endRound
  ) external returns (uint256[] userRewards)
```
View user rewards between rounds



#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_user` | address |       User address
|`_startRound` | uint256 | Start lottery id
|`_endRound` | uint256 |   End lottery id

### viewRewardPerTicketInBracket
```solidity
  function viewRewardPerTicketInBracket(
  ) external returns (uint256[4])
```
View rewards for each ticket in a given lottery round, given bracket



### viewWinnerAmount
```solidity
  function viewWinnerAmount(
  ) external returns (uint256[4])
```
View winner ticket amount for a given lottery round, for each bracket



### viewRewardsBreakdown
```solidity
  function viewRewardsBreakdown(
  ) external returns (uint256[4])
```
View rewards breakdown for a given lottery round



### setMaxNumberTicketsEachTime
```solidity
  function setMaxNumberTicketsEachTime(
    uint256 _maxNumber
  ) external
```
Set max number can buy/claim each time



#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_maxNumber` | uint256 | Max number each time

### setTreasury
```solidity
  function setTreasury(
    address _treasury
  ) external
```
Set treasury wallet address



#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_treasury` | address | Treasury address

### setRoundLength
```solidity
  function setRoundLength(
    uint256 _length
  ) external
```
Set round length



#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_length` | uint256 | New round length

### buyTickets
```solidity
  function buyTickets(
    uint32[] _ticketNumbers
  ) external
```
Buy tickets for the current lottery round


Need to transfer the 4-digit number to a 5-digit number to be used here (+10000)
     Can not be called by a smart contract
     Can only purchase in the current round
     E.g. You are selecting the number of 1-2-3-4 (lowest to highest)
          You will need to pass a number "14321"


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_ticketNumbers` | uint32[] | Array of ticket numbers between 10,000 and 19,999

### claimTickets
```solidity
  function claimTickets(
    uint256 _lotteryId,
    uint256[] _ticketIds,
    uint32[] _brackets
  ) external
```
Claim winning tickets


Callable by users only, not contract


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_lotteryId` | uint256 | Lottery id
|`_ticketIds` | uint256[] | Array of ticket ids
|`_brackets` | uint32[] |  Bracket / prize level of each ticket

### claimAllTickets
```solidity
  function claimAllTickets(
    uint256 _lotteryId
  ) external
```
Claim all winning tickets for a lottery round


Callable by users only, not contract
     Gas cost may be oversized, recommended to get brackets offchain first
     Get brackets offchain and call function "claimTickets"


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_lotteryId` | uint256 | Lottery id

### startLottery
```solidity
  function startLottery(
  ) external
```
Start a new lottery round



### closeLottery
```solidity
  function closeLottery(
    uint256 _lotteryId
  ) external
```
Close a lottery



#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_lotteryId` | uint256 | Lottery round

### drawFinalNumberAndMakeLotteryClaimable
```solidity
  function drawFinalNumberAndMakeLotteryClaimable(
    uint256 _lotteryId,
    bool _autoInjection
  ) external
```
Draw the final number, calculate reward in Degis for each group,
               and make this lottery claimable (need to wait for the random generator)



#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_lotteryId` | uint256 |     Lottery round
|`_autoInjection` | bool | Auto inject funds into next lottery

### changeRandomGenerator
```solidity
  function changeRandomGenerator(
    address _randomGeneratorAddress
  ) external
```
Change the random generator contract address


The calls to functions are used to verify the new generator implements them properly.
     It is necessary to wait for the VRF response before starting a round.


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_randomGeneratorAddress` | address | address of the random generator

### injectFunds
```solidity
  function injectFunds(
    uint256 _amount
  ) external
```
Inject funds


Those DEG transferred to this contract but not by this function
     will not be counted for prize pools


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_amount` | uint256 | DEG amount to inject

### recoverWrongTokens
```solidity
  function recoverWrongTokens(
    address _tokenAddress,
    uint256 _tokenAmount
  ) external
```
Recover wrong tokens sent to the contract, only by the owner
         All tokens except Degis are wrong tokens



#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_tokenAddress` | address | Address of the token to withdraw
|`_tokenAmount` | uint256 |  Token amount to withdraw

### _calculateTotalPrice
```solidity
  function _calculateTotalPrice(
    uint256 _price,
    uint256 _num
  ) internal returns (uint256 totalPrice)
```
/**
Calculate total price when buying many tickets
        1 ticket = 100%  2 tickets = 98%  3 tickets = 98% * 98 % ...
        Maximum discount: 98% ^ 10 ≈ 82%



#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_price` | uint256 | Ticket price in DEG
|`_num` | uint256 |   Number of tickets to be bought


#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`totalPrice`| uint256 | Total price in DEG
/
### _getBracket
```solidity
  function _getBracket(
    uint256 _lotteryId,
    uint256 _ticketId
  ) internal returns (uint32 highestBracket)
```

returns highest bracket a ticket number falls into



#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_lotteryId` | uint256 | Lottery round
|`_ticketId` | uint256 |  Ticket id
/

### _calculateRewardsForTicketId
```solidity
  function _calculateRewardsForTicketId(
    uint256 _lotteryId,
    uint256 _ticketId,
    uint32 _bracket
  ) internal returns (uint256)
```

Calculate rewards for a given ticket



#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_lotteryId` | uint256 | Lottery id
|`_ticketId` | uint256 |  Ticket id
|`_bracket` | uint32 |   Bracket for the ticketId to verify the claim and calculate rewards
/

### _reverseTicketNumber
```solidity
  function _reverseTicketNumber(
    uint256 _number
  ) public returns (uint32)
```

Reverse the ticket number
        E.g. User want to buy "1234"
             The input number will be 11234
             The reversed output will be 14321



#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`_number` | uint256 | Input ticket number


#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`reversedNumber`| uint32 | Reversed number + 10000
/
### _isContract
```solidity
  function _isContract(
  ) internal returns (bool)
```

Check if an address is a contract
/



## Events
### MaxNumberTicketsEachTimeChanged
```solidity
  event MaxNumberTicketsEachTimeChanged(
  )
```



### RoundLengthChanged
```solidity
  event RoundLengthChanged(
  )
```



### TreasuryChanged
```solidity
  event TreasuryChanged(
  )
```



### AdminTokenRecovery
```solidity
  event AdminTokenRecovery(
  )
```



### LotteryClose
```solidity
  event LotteryClose(
  )
```



### LotteryInjection
```solidity
  event LotteryInjection(
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



### NewRandomGenerator
```solidity
  event NewRandomGenerator(
  )
```



### TicketsPurchased
```solidity
  event TicketsPurchased(
  )
```



### TicketsClaim
```solidity
  event TicketsClaim(
  )
```



