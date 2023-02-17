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


// npx hardhat startILM --network avax --policytoken 0x86C2DB22c28FD5397405Ca0DBA241f04B64B06a7 --stablecoin USDC --deadline 1676534400

// npx hardhat startILM --network avax --policytoken 0x3B1993aeC0658855e172034E6D938AC10A982904 --stablecoin USDC --deadline 1676534400

// npx hardhat startILM --network avax --policytoken 0x3650eF4231312d716817dA5CBFae3A7c8EC7D7c9 --stablecoin USDC --deadline 1676534400

// npx hardhat startILM --network avax --policytoken 0xc8ad7c24Ca20DDFA58fB5D6cfEF1BdBc68d24157 --stablecoin USDC --deadline 1676534400

// npx hardhat startILM --network avax --policytoken 0x68B18d9a6d99Aeb284a1217f846F60A80b7E19E2 --stablecoin USDC --deadline 1676534400

// npx hardhat startILM --network avax --policytoken 0x3cd749b5A124b35879a3278A41d9236be5EBA2a7 --stablecoin USDC --deadline 1676534400



// npx hardhat stopILM --network avax --name AVAX_18.1_L_0503 --policytoken 0x86C2DB22c28FD5397405Ca0DBA241f04B64B06a7 --deadline 1677744000

// npx hardhat stopILM --network avax --name XAVA_0.519_L_0503 --policytoken 0x3B1993aeC0658855e172034E6D938AC10A982904 --deadline 1677744000

// npx hardhat stopILM --network avax --name JOE_0.24_L_0503 --policytoken 0x3650eF4231312d716817dA5CBFae3A7c8EC7D7c9 --deadline 1677744000

// npx hardhat stopILM --network avax --name BTC_22120.9_L_0503 --policytoken 0xc8ad7c24Ca20DDFA58fB5D6cfEF1BdBc68d24157 --deadline 1677744000

// npx hardhat stopILM --network avax --name CAI_97.74_L_0503 --policytoken 0x68B18d9a6d99Aeb284a1217f846F60A80b7E19E2 --deadline 1677744000

// npx hardhat stopILM --network avax --name RoboVault_1.034774_L_1502 --policytoken 0xe527dDCD120A346a03D2c99c52530C765af3194f --deadline 1676188800

// farming

// 0.00105 + 0.00011

// npx hardhat addFarmingPool --network avax --name IM_AVAX_18.1_L_0503 --address 0x58638Eb847077d2f46C0DFDE914C2508fe751b5f --reward 0.00105 --bonus 0.00011 --doublereward 0

// npx hardhat addFarmingPool --network avax --name IM_XAVA_0.519_L_0503 --address 0x8921CD950f3fe03E61Ed335b0D4Ef6c209FCD657 --reward 0.00105 --bonus 0.00011 --doublereward 0

// npx hardhat addFarmingPool --network avax --name IM_JOE_0.24_L_0503 --address 0x468FC2461fa4c53B661673458FC0a45cC8c4e297 --reward 0.00105 --bonus 0.00011 --doublereward 0

// npx hardhat addFarmingPool --network avax --name IM_BTC_22120.9_L_0503 --address 0x23F6e1541BD9b2106d3771969F8044B75929CE10 --reward 0.00105 --bonus 0.00011 --doublereward 0

// npx hardhat addFarmingPool --network avax --name IM_CAI_97.74_L_0503 --address 0x26772971215D842628609E98B90DFB16B87d57Fd --reward 0.00105 --bonus 0.00011 --doublereward 0


// 0.00095 + 0.00009

// npx hardhat addFarmingPool --network avax --name AVAX_18.1_L_0503 --address 0x01c8f9774beD44C917bB28F181Aaf0df98934D41 --reward 0.00095 --bonus 0.00009 --doublereward 0

// npx hardhat addFarmingPool --network avax --name XAVA_0.519_L_0503 --address 0x78c123Ab0622eA75399F7a422bD60Eb4D3a81276 --reward 0.00095  --bonus 0.00009 --doublereward 0

// npx hardhat addFarmingPool --network avax --name JOE_0.24_L_0503 --address 0x458568EBc386b064cA2F09b262f5dE9A7319DDd5 --reward 0.00095 --bonus 0.00009 --doublereward 0

// npx hardhat addFarmingPool --network avax --name BTC_22120.9_L_0503 --address 0x980D2855ab57661D8Df11453797751091806003e --reward 0.00095  --bonus 0.00009 --doublereward 0

// npx hardhat addFarmingPool --network avax --name CAI_97.74_L_0503 --address 0x56718bf957251631d6BE1951CB84e2F3D231D9fc --reward 0.00095  --bonus 0.00009 --doublereward 0
