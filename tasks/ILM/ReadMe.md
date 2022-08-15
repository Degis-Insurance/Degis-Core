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

//npx hardhat stopILM --network avax --name JOE_0.29_L_3107 --policytoken 0x69dAF2F6346CbD17eef5677500E0298da45d05CE --deadline 1659168000 
// npx hardhat startILM --network avax --policytoken 0xFE21553f50d05552860F3396da5D092517470f38 --stablecoin USDC.e --deadline 1659254400 


// npx hardhat stopILM --network avax --name AVAX_24.3_L_1708 --policytoken 0xf3aF12288580c5B33EeDe074d32bf6321dCE8E5b --deadline 1660464000

// npx hardhat stopILM --network avax --name XAVA_0.52_L_1708 --policytoken 0x7F20e955EaB5BA9D1A29AD3E26FB370AFb349170 --deadline 1660464000

// npx hardhat stopILM --network avax --name JOE_0.37_L_1708 --policytoken 0xFE21553f50d05552860F3396da5D092517470f38 --deadline 1660464000

//npx hardhat startILM --network avax --policytoken 0xBACaa17927aD15A0E2CC2a82D87727FDd6f0F727 --stablecoin USDC.e --deadline 1660550400

// npx hardhat addFarmingPool --network avax --name AVAX_0.37_L_1708 --address 0xa031C7a8F46bCFd0174Dc6B8c9e0b92c6915123F --reward 0.01929 --bonus 0.00385 --doublereward 0