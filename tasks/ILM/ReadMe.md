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


// npx hardhat startILM --network avax --policytoken 0xe29dbFe149f3188AE8B61b9855772bf34F338A29 --stablecoin USDC --deadline 1674979200

// npx hardhat startILM --network avax --policytoken 0x149951fdb69D09d78362300825565de67521F0D0 --stablecoin USDC --deadline 1674979200

// npx hardhat startILM --network avax --policytoken 0x927d8f64698D6F07408824F8fFf7e5e6772F8bE0 --stablecoin USDC --deadline 1674979200

// npx hardhat startILM --network avax --policytoken 0x684e652DD061bf5DEF8d1BBb6E315073E916b517 --stablecoin USDC --deadline 1674979200

// npx hardhat startILM --network avax --policytoken 0xB9bC91022179Bf6e11EA836A7Bd59DEeAb6917Bc --stablecoin USDC --deadline 1674979200

// npx hardhat startILM --network avax --policytoken 0xe527dDCD120A346a03D2c99c52530C765af3194f --stablecoin USDC --deadline 1674979200



// npx hardhat stopILM --network avax --name AVAX_11.82_L_2501 --policytoken 0x8157bA955cB00DC750b6AF23492766D791087ABF --deadline 1674374400

// npx hardhat stopILM --network avax --name XAVA_0.152_L_2501 --policytoken 0x19ab699100A2e4ff711eA1395681E96b6E3220c5 --deadline 1674374400

// npx hardhat stopILM --network avax --name JOE_0.142_L_2501 --policytoken 0xcf31f30fa31acCd90DF03b830666Af52F4f22E90 --deadline 1674374400

// npx hardhat stopILM --network avax --name BTC_16946.8_L_2501 --policytoken 0xEca10156e7ADB5865D0594FDe332d4fC447b7754 --deadline 1674374400

// npx hardhat stopILM --network avax --name CAI_61.6_L_2501 --policytoken 0xA8BA1190a7fed1aC04D4B2137a57DFdb37Aef541 --deadline 1674374400

// npx hardhat stopILM --network avax --name RoboVault_1.031811_L_2501 --policytoken 0xfA2aB0595ed435A5b555c2154662BC47C9b9eE7A --deadline 1674374400

// farming

// 0.00572 + 0.00057

// npx hardhat addFarmingPool --network avax --name IM_AVAX_11.82_L_2501 --address 0xa266E5ED5377a2CC6c7Be7f1d3920e8Cf676C844 --reward 0.00572 --bonus 0.00057 --doublereward 0

// npx hardhat addFarmingPool --network avax --name IM_XAVA_0.152_L_2501 --address 0x4183699C1Ff6a003493cc5E690544C5BEcdf0990 --reward 0.00572 --bonus 0.00057 --doublereward 0

// npx hardhat addFarmingPool --network avax --name IM_JOE_0.142_L_2501 --address 0xCA303BD7514B381144f5e97DBF6d434266d48C4e --reward 0.00572 --bonus 0.00057 --doublereward 0

// npx hardhat addFarmingPool --network avax --name IM_BTC_16946.8_L_2501 --address 0x46e3933a8f98893a9de6c102D0fEEB3661c735e3 --reward 0.00572 --bonus 0.00057 --doublereward 0

// npx hardhat addFarmingPool --network avax --name IM_CAI_61.6_L_2501 --address 0x4c4Ed9CAE82159c735eE57893dC469db3c488342 --reward 0.00572 --bonus 0.00057 --doublereward 0

// npx hardhat addFarmingPool --network avax --name IM_RoboVault_1.031811_L_2501 --address 0x77d1A688C762Ff883FB2dEF400DfB6c49FFb8484 --reward 0.00572 --bonus 0.00057 --doublereward 0

// 0.00477 + 0.00048

// npx hardhat addFarmingPool --network avax --name AVAX_11.97_L_0701 --address 0x81a74f9414535Daa8af3e6F2CC7238eEa50789c1 --reward 0.00477 --bonus 0.00048 --doublereward 0

// npx hardhat addFarmingPool --network avax --name XAVA_0.153_L_0701 --address 0xdb2Adaa3620193172823B25f3f24Aad19a5f3654 --reward 0.00477  --bonus 0.00048 --doublereward 0

// npx hardhat addFarmingPool --network avax --name JOE_0.144_L_0701 --address 0xBb5673cF671E8d4680A01b7C3c2B323BB04B4450 --reward 0.00477  --bonus 0.00048 --doublereward 0

// npx hardhat addFarmingPool --network avax --name BTC_16812.1_L_0701 --address 0xA5261A5bed97Bead228BF38199251325054C3504 --reward 0.00477  --bonus 0.00048 --doublereward 0

// npx hardhat addFarmingPool --network avax --name CAI_61.6_L_2501 --address 0xE1Aa5458f59aDD9099BBcD47C9600C3A4eA50051 --reward 0.00477  --bonus 0.00048 --doublereward 0

// npx hardhat addFarmingPool --network avax --name RoboVault_1.031094_L_0701 --address 0xd7F8160192a274bb62e04ebE1B198e15F97Be802 --reward 0.00477 --bonus 0.00048 --doublereward 0