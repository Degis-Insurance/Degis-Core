# Tasks when launching the project

1. yarn deploy --network fuji --reset

2. npx hardhat deployNPToken (params)

3. npx hardhat deployNPPool (params)

4. npx hardhat addAllowedContractsForNP (params)

5. npx hardhat addFarmingPool (params)

6. npx hardhat setVaultReward (params)

### 1. Add minter and burner address for degis token & buyer token

Effects:

- Can not start farming

- Can not buy new policies in FD and NP

- Can not use purchase incentive vault

### 2. Set policyCore

Effects:

- Can not deploy new NP tokens

- Can not deploy new NP pools

- Can not distribute income to lottery & emergencyPool
