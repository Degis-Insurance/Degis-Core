# Workflow for Degis Farming Pool

Tip: All parameters for hardhat tasks are in lower case

## Normal Farming (Single Token Reward)

### Task 1: addFarmingPool

- **Name**: Name of the farming pool (not strict, not recorded in contract)
- **Address**: Address of the token to be deposited to farming pool
- **Reward**: Basic reward speed of DEG (in seconds)
- **Bonus**: Bonus reward speed of DEG (in seconds) (for veDEG boosting)
- **DoubleReward**: Double reward token address (not double reward contract) (this token should be set up in DoubleRewarder contract) (for no double reward pools, just set this parameter to 0, not zero address)

E.g.

```
npx hardhat addFarmingPool --network avax --name AVAX_10.0_L_3006 --address 0x1234 --reward 0.1 --bonus 0.2 --doublereward 0xabcd
```

### Task 2: setFarmingPoolDegisReward

- **Id**: ID of the farming pool (found in ~/info/FarmingPool.json)
- **Reward**: Reward speed of DEG (in seconds)
- **Bonus**: Bonus reward speed of DEG (in seconds) (for veDEG boosting)

E.g.

```
npx hardhat setFarmingPoolDegisReward --network avax --id 10 --reward 0.1 --bonus 0.2
```

## Double Reward Farming

### Task 1: addDoubleRewardToken

- **Token**: Address of the double reward token
- **LPToken**: Address of the token to be deposited to farming pool and get the double reward token as reward

E.g.

```
npx hardhat addDoubleRewardToken --network avax --token 0x1234 --lptoken 0xabcd
```

### Task 2: setDoubleRewardSpeed

- **Token**: Address of the double reward token
- **LPToken**: Address of the lp token (to be deposited to farming pool)
- **Reward**: Reward speed of double reward token (in seconds)

E.g.

```
npx hardhat setDoubleRewardSpeed --network avax --token 0x1234 --lptoken 0xabcd --reward 0.1
```

### Task 3: addFarmingPool (with double reward token above)
