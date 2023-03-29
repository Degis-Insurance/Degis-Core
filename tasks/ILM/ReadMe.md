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


// npx hardhat startILM --network avax --policytoken 0x53dD54a49C3Ce0A593411347FF01977ed4f5CeCc --stablecoin USDC --deadline 1680076800

// npx hardhat startILM --network avax --policytoken 0xe4BcEb6fEc88Fb57F20C0631353172d17201f82C --stablecoin USDC --deadline 1680076800

// npx hardhat startILM --network avax --policytoken 0xf95741aaac561743593FDCb45Dd0C51AF674C08A --stablecoin USDC --deadline 1680076800

// npx hardhat startILM --network avax --policytoken 0xA702C79E46a60677FaCa42d025ac09e8930d1ec1 --stablecoin USDC --deadline 1680076800

// npx hardhat startILM --network avax --policytoken 0xafed3C37587Ece288eBE9494fA7aa5d463E94426 --stablecoin USDC --deadline 1680076800

// npx hardhat startILM --network avax --policytoken 0xdDf439102e9E87B6e72760c227d7c96B1c18Ae9f --stablecoin USDC --deadline 1680076800



// hh stopILM --network avax --name AVAX_16.6_L_1504 --policytoken 0x53dD54a49C3Ce0A593411347FF01977ed4f5CeCc --deadline 1681286400
// hh stopILM --network avax --name XAVA_0.404_L_1504 --policytoken 0xe4BcEb6fEc88Fb57F20C0631353172d17201f82C --deadline 1681286400
// hh stopILM --network avax --name JOE_0.57_L_1504 --policytoken 0xf95741aaac561743593FDCb45Dd0C51AF674C08A --deadline 1681286400
// hh stopILM --network avax --name BTC_27022.8_L_1504 --policytoken 0xA702C79E46a60677FaCa42d025ac09e8930d1ec1 --deadline 1681286400
// hh stopILM --network avax --name CAI_138.81_L_1504 --policytoken 0xafed3C37587Ece288eBE9494fA7aa5d463E94426 --deadline 1681286400
// hh stopILM --network avax --name ETH_1728.55_L_1504 --policytoken 0xdDf439102e9E87B6e72760c227d7c96B1c18Ae9f --deadline 1681286400

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
