## Steps to start ILM

1. Deploy a new naughty price token

task: deployNPToken


2. Start ILM

task: startILM

3. Add Farming Pool for ILM

task: addFarmingPool

3. Finish ILM

task: finishILM

4. Normal Naughty Price Farming Pool and later operations

//npx hardhat stopILM --network avax --name AVAX_21.7_L_0110 --policytoken 0xdE49E17772f4D4269D5E75B4485418e1045520BC --deadline 1664352000 
// npx hardhat startILM --network avax --policytoken 0xFE21553f50d05552860F3396da5D092517470f38 --stablecoin USDC.e --deadline 1659254400 


// npx hardhat startILM --network avax --policytoken 0xdE49E17772f4D4269D5E75B4485418e1045520BC --stablecoin USDC.e --deadline 1663142400

// npx hardhat startILM --network avax --policytoken 0xf1bc2bDB75c0fF8183fdb40F67b9ef317E3888FD --stablecoin USDC.e --deadline 1663142400

// npx hardhat startILM --network avax --policytoken 0xAAe624802e18a0F5b7029F11a5DFac4031F11c96 --stablecoin USDC.e --deadline 1663142400

//npx hardhat startILM --network avax --policytoken 0x772d3DaDdc2Fe0b6d0e79580446B9bC4b2aAb1Ed --stablecoin USDC.e --deadline 1663142400

// npx hardhat addFarmingPool --network avax --name AVAX_0.37_L_1708 --address 0xa031C7a8F46bCFd0174Dc6B8c9e0b92c6915123F --reward 0.01929 --bonus 0.00385 --doublereward 0