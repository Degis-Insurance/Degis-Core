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


// hh startILM --network avax --policytoken 0xDf5cB7cbe7204657b3b5ECB255D460fEc853C17D --stablecoin USDC --deadline 1685606400
// hh startILM --network avax --policytoken 0xa5B06B89F0c72a3321B949749FE0c6D55CAaef5e --stablecoin USDC --deadline 1685606400

// hh startILM --network avax --policytoken 0x8225F6a8665378F3231100042740CDaf72464123 --stablecoin USDC --deadline 1685606400
// hh startILM --network avax --policytoken 0xeDb8E3DABC4C519290b010250A30aFd561e9501a --stablecoin USDC --deadline 1685606400

// hh startILM --network avax --policytoken 0x6614b1290ed3f0b4aF3ea1286f00D3888E04Be53 --stablecoin USDC --deadline 1685606400
// hh startILM --network avax --policytoken 0x11Aaba0c37ff7ad881265E966C79c2aeB26BbcFb --stablecoin USDC --deadline 1685606400

// hh startILM --network avax --policytoken 0x38a09764Fa7516d2E429382540dcB62044E7570a --stablecoin USDC --deadline 1685606400
// hh startILM --network avax --policytoken 0x8785b2eAbAf64Fb2A10D3dC7d95f4A7d094b9Ef9 --stablecoin USDC --deadline 1685606400

// hh startILM --network avax --policytoken 0xc9d9FbAe43073A69aaEBa956Ad80fC0A11aB7ae0 --stablecoin USDC --deadline 1685606400
// hh startILM --network avax --policytoken 0xAbB2E74085e98Ed9671639bDA1187245449BeE27 --stablecoin USDC --deadline 1685606400

// hh startILM --network avax --policytoken 0xB680fE0c1441342179DBE5f4b6ff85Bb016dC402 --stablecoin USDC --deadline 1685606400
// hh startILM --network avax --policytoken 0x2fE92D2590BAA9E88741e60379CbFA8BA23505c3 --stablecoin USDC --deadline 1685606400


// hh stopILM --network avax --name AVAX_14.16_L_1806 --policytoken 0xDf5cB7cbe7204657b3b5ECB255D460fEc853C17D --deadline 1686816000
// hh stopILM --network avax --name AVAX_14.16_H_1806 --policytoken 0xa5B06B89F0c72a3321B949749FE0c6D55CAaef5e --deadline 1686816000

// hh stopILM --network avax --name XAVA_0.253_L_1806 --policytoken 0x8225F6a8665378F3231100042740CDaf72464123 --deadline 1686816000
// hh stopILM --network avax --name XAVA_0.253_H_1806 --policytoken 0xeDb8E3DABC4C519290b010250A30aFd561e9501a --deadline 1686816000

// hh stopILM --network avax --name JOE_0.41_L_1806 --policytoken 0x6614b1290ed3f0b4aF3ea1286f00D3888E04Be53 --deadline 1686816000
// hh stopILM --network avax --name JOE_0.41_H_1806 --policytoken 0x11Aaba0c37ff7ad881265E966C79c2aeB26BbcFb --deadline 1686816000

// hh stopILM --network avax --name BTC_27182.8_L_1806 --policytoken 0x38a09764Fa7516d2E429382540dcB62044E7570a --deadline 1686816000
// hh stopILM --network avax --name BTC_27182.8_H_1806 --policytoken 0x8785b2eAbAf64Fb2A10D3dC7d95f4A7d094b9Ef9 --deadline 1686816000

// hh stopILM --network avax --name CAI_114.1_L_1806 --policytoken 0xc9d9FbAe43073A69aaEBa956Ad80fC0A11aB7ae0 --deadline 1686816000
// hh stopILM --network avax --name CAI_114.1_H_1806 --policytoken 0xAbB2E74085e98Ed9671639bDA1187245449BeE27 --deadline 1686816000

// hh stopILM --network avax --name ETH_1870.4_L_1806 --policytoken 0xB680fE0c1441342179DBE5f4b6ff85Bb016dC402 --deadline 1686816000
// hh stopILM --network avax --name ETH_1870.4_H_1806 --policytoken 0x2fE92D2590BAA9E88741e60379CbFA8BA23505c3 --deadline 1686816000


// farming

// 0.00105 + 0.00011

// hh addFarmingPool --network avax --name IM_AVAX_16.6_L_1504 --address 0x25D096063D016e4b6275b2f860F661f1AC3217E7 --reward 0.00105 --bonus 0.00011 --doublereward 0
// hh addFarmingPool --network avax --name IM_XAVA_0.404_L_1504 --address 0x12676BDb69F0e096559175e3Fe6e24B9dD7BF679 --reward 0.00105 --bonus 0.00011 --doublereward 0
// hh addFarmingPool --network avax --name IM_JOE_0.57_L_1504 --address 0x92C9d1F245A6faA056C59691FD9f8b6c9Bd4E694 --reward 0.00105 --bonus 0.00011 --doublereward 0
// hh addFarmingPool --network avax --name IM_BTC_27022.8_L_1504 --address 0x1991Ef9C0FF31Fbe6fAb771208379fcA7F465776 --reward 0.00105 --bonus 0.00011 --doublereward 0
// hh addFarmingPool --network avax --name IM_CAI_138.81_L_1504 --address 0xF2D5852d9F9C0bBba4DD70880d9dA28644b55c43 --reward 0.00105 --bonus 0.00011 --doublereward 0
// hh addFarmingPool --network avax --name IM_ETH_1728.55_L_1504 --address 0x83d1B871909E6eEDded6816d5386A6cAFb39E979 --reward 0.00105 --bonus 0.00011 --doublereward 0


// 0.00095 + 0.00009

// hh addFarmingPool --network avax --name AVAX_16.6_L_1504 --address 0x62f39ea3f621045d9a0fE16e5240D3A6C0C35693 --reward 0.00095 --bonus 0.00009 --doublereward 0
// hh addFarmingPool --network avax --name XAVA_0.404_L_1504 --address 0xb8e0f08117626b46cCcb22865Fc7B8016577A97b --reward 0.00095  --bonus 0.00009 --doublereward 0
// hh addFarmingPool --network avax --name JOE_0.57_L_1504 --address 0x1B1d240854C56487158008b9D181cA370c019655 --reward 0.00095 --bonus 0.00009 --doublereward 0
// hh addFarmingPool --network avax --name BTC_27022.8_L_1504 --address 0x94E52F2e0394002207F6eac4d698bB39298e6c1D --reward 0.00095  --bonus 0.00009 --doublereward 0
// hh addFarmingPool --network avax --name CAI_138.81_L_1504 --address 0xDd2947927228530A2B50563ccb100da2ac5565a6 --reward 0.00095  --bonus 0.00009 --doublereward 0
// hh addFarmingPool --network avax --name ETH_1728.55_L_1504 --address 0xCB0B0e2B6ece5DC448F1A5C56b112E36EE863380 --reward 0.00095  --bonus 0.00009 --doublereward 0
