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


// npx hardhat startILM --network avax --policytoken 0x95a696f981F911bc07672b694c947cE65063c96C --stablecoin Shield --deadline 1670313600

// npx hardhat startILM --network avax --policytoken 0x482481834D86459135Fb2b00450a4Fd3503d6DE6 --stablecoin Shield --deadline 1670313600

// npx hardhat startILM --network avax --policytoken 0x06A6B05261b13e9Ac661BbE3245a07211f8af4f9 --stablecoin Shield --deadline 1670313600

// npx hardhat startILM --network avax --policytoken 0xd8A551Ba25EA7e864ED78536e2DB1cB42D9C3d26 --stablecoin Shield --deadline 1670313600

// npx hardhat startILM --network avax --policytoken 0x80E30c7d9be1a16502F6f963F9c2Ad304B4FE689 --stablecoin Shield --deadline 1670313600



// npx hardhat stopILM --network avax --name AVAX_14.0_L_1912 --policytoken 0x95a696f981F911bc07672b694c947cE65063c96C --deadline 1671177600

// npx hardhat stopILM --network avax --name XAVA_0.18_L_1912 --policytoken 0x482481834D86459135Fb2b00450a4Fd3503d6DE6 --deadline 1671177600

// npx hardhat stopILM --network avax --name JOE_0.186_L_1912 --policytoken 0x06A6B05261b13e9Ac661BbE3245a07211f8af4f9 --deadline 1671177600

// npx hardhat stopILM --network avax --name BTC_17259.6_L_1912 --policytoken 0xd8A551Ba25EA7e864ED78536e2DB1cB42D9C3d26 --deadline 1671177600

// npx hardhat stopILM --network avax --name RoboVault_1.029663_L_1912 --policytoken 0x80E30c7d9be1a16502F6f963F9c2Ad304B4FE689 --deadline 1671177600


// farming


// npx hardhat addFarmingPool --network avax --name IM_AVAX_14.0_L_1912 --address 0xB910E5FB81B3BAe35163B67ed04068B91f3D8174 --reward 0.00525 --bonus 0.00105 --doublereward 0

// npx hardhat addFarmingPool --network avax --name IM_XAVA_0.18_L_1912 --address 0x21f555775A935ba27685e94529D67F840168cE34 --reward 0.00525 --bonus 0.00105 --doublereward 0

// npx hardhat addFarmingPool --network avax --name IM_JOE_0.186_L_1912 --address 0x1E07EB49B20aB5b432C256F33F1D5eaBAA7F4c75 --reward 0.00525 --bonus 0.00105 --doublereward 0

// npx hardhat addFarmingPool --network avax --name IM_BTC_17259.6_L_1912 --address 0x1fD0Fb9970709F852B0c2be5d2FA6954F3D75Cfe --reward 0.00525 --bonus 0.00105 --doublereward 0

// npx hardhat addFarmingPool --network avax --name AVAX_14.0_L_1912 --address 0x9825E646581B6C8354D8088b34aA9a575B10541b --reward 0.00438 --bonus 0.00088 --doublereward 0

// npx hardhat addFarmingPool --network avax --name XAVA_0.18_L_1912 --address 0xdeB02fada6aD9a4D42402703E8723E5997e076eE --reward 0.00438 --bonus 0.00088 --doublereward 0

// npx hardhat addFarmingPool --network avax --name JOE_0.186_L_1912 --address 0xb7F9C1e2aBa7a25D9861d59bbb94Cd6c035AE02b --reward 0.00438 --bonus 0.00088 --doublereward 0

// npx hardhat addFarmingPool --network avax --name BTC_17259.6_L_1912 --address 0xd9c94Cf94Cfe159d1965B0bc664464d2A56eA9A0 --reward 0.00438 --bonus 0.00088 --doublereward 0