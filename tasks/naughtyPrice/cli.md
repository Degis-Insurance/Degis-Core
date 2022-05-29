## #sd

---

---

---

npx hardhat deployNPToken --network avaxTest --name AVAX --stablecoin USDC.e --k 26.0 --namedecimals 0 --iscall 0 --round 2905 --deadline 1653897600 --settletime 1653897600

npx hardhat deployNPPool --network fuji --name AVAX_32.0_L_3006 --stablecoin USDC.e --deadline 1656576000 --fee 50

npx hardhat addFarmingPool --network avax --name AVAX_77.0_L_0605 --address 0xE1D05A01F05D0eBfe91063E05B27c0f5142C4690 --reward 0.035 --bonus 0.052
