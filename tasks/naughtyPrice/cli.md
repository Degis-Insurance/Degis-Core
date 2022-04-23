## #sd

---

---

---

npx hardhat deployNPToken --network avaxTest --name AVAX --stablecoin USDC.e --k 74.0 --namedecimals 0 --iscall 0 --round 2704 --deadline 1651046400 --settletime 1651046400

npx hardhat deployNPPool --network avaxTest --name AVAX_74.0_L_2704 --stablecoin USDC.e --deadline 1651046400 --fee 50

npx hardhat addFarmingPool --network avax --name AVAX_77.0_L_0605 --address 0xE1D05A01F05D0eBfe91063E05B27c0f5142C4690 --reward 0.035 --bonus 0.052
