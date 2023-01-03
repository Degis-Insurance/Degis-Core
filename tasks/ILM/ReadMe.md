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


// npx hardhat startILM --network avax --policytoken 0x480879b10eDda7550A1dF456a9D3255e5D01C20a --stablecoin Shield --deadline 1671609600

// npx hardhat startILM --network avax --policytoken 0xc4c239C793e167FaB0EDD717a2E352fEdE860De0 --stablecoin Shield --deadline 1671609600

// npx hardhat startILM --network avax --policytoken 0xbab92af590965Dab8bed50015669bd4076952AF0 --stablecoin Shield --deadline 1671609600

// npx hardhat startILM --network avax --policytoken 0x7D976745DC0cdaFe18d32531d3179877FAcCa272 --stablecoin Shield --deadline 1671609600

// npx hardhat startILM --network avax --policytoken 0xc135954f62db00e761c3E35AAf693CB995B6bBAa --stablecoin Shield --deadline 1671609600




// npx hardhat stopILM --network avax --name AVAX_11.97_L_0701 --policytoken 0x480879b10eDda7550A1dF456a9D3255e5D01C20a --deadline 1672819200

// npx hardhat stopILM --network avax --name XAVA_0.153_L_0701 --policytoken 0xc4c239C793e167FaB0EDD717a2E352fEdE860De0 --deadline 1672819200

// npx hardhat stopILM --network avax --name JOE_0.144_L_0701 --policytoken 0xbab92af590965Dab8bed50015669bd4076952AF0 --deadline 1672819200

// npx hardhat stopILM --network avax --name BTC_16812.1_L_0701 --policytoken 0x7D976745DC0cdaFe18d32531d3179877FAcCa272 --deadline 1672819200

// npx hardhat stopILM --network avax --name RoboVault_1.031094_L_0701 --policytoken 0xc135954f62db00e761c3E35AAf693CB995B6bBAa --deadline 1672819200


// farming

// old 0.00525
// new 0.01103

// npx hardhat addFarmingPool --network avax --name IM_AVAX_11.97_L_0701 --address 0xDb3AE651C92e8305Cabf02286C7BAc3FE470508E --reward 0.01103 --bonus 0.00105 --doublereward 0

// npx hardhat addFarmingPool --network avax --name IM_XAVA_0.153_L_0701 --address 0x7Fd22Fdc3A643A4383139540a311b9254c82d9bf --reward 0.01103 --bonus 0.00105 --doublereward 0

// npx hardhat addFarmingPool --network avax --name IM_JOE_0.144_L_0701 --address 0x33B8Dcae9C1b037aC4Df65cE441A35f64Bd5aa3b --reward 0.01103 --bonus 0.00105 --doublereward 0

// npx hardhat addFarmingPool --network avax --name IM_BTC_16812.1_L_0701 --address 0x24FE92C118C0200BdC6FD4aF108837cf025ff203 --reward 0.01103 --bonus 0.00105 --doublereward 0

// old 0.00438
// new 0.01016 

// npx hardhat addFarmingPool --network avax --name AVAX_11.97_L_0701 --address 0x967007Ec5a37E822fCC54d5bB94EcDDbaEA8bB56 --reward 0.01016 --bonus 0.00088 --doublereward 0

// npx hardhat addFarmingPool --network avax --name XAVA_0.153_L_0701 --address 0x30B2411230E8D5A5d2dfE3857CA5ABE7d125AB5c --reward 0.01016  --bonus 0.00088 --doublereward 0

// npx hardhat addFarmingPool --network avax --name JOE_0.144_L_0701 --address 0x87e5b16342aD389E393Fa99d342c6B8DA90B46D4 --reward 0.01016  --bonus 0.00088 --doublereward 0

// npx hardhat addFarmingPool --network avax --name BTC_16812.1_L_0701 --address 0xb4CA4424B040c9662832B33c8895f768E4B7a15C --reward 0.01016  --bonus 0.00088 --doublereward 0

// npx hardhat addFarmingPool --network avax --name RoboVault_1.031094_L_0701 --address 0x14f6CF471Ed61195cD540DE78c496D9F3b7BbC4d --reward 0.00578 --bonus 0 --doublereward 0