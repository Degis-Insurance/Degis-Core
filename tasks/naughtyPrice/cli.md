## #sd

---

---

---

npx hardhat deployNPToken --network avaxTest --name AVAX --stablecoin USDC.e --k 64.0 --namedecimals 0 --iscall 0 --round 0305 --deadline 1651564800 --settletime 1651564800

npx hardhat deployNPPool --network avaxTest --name AVAX_64.0_L_0305 --stablecoin USDC.e --deadline 1651564800 --fee 50

npx hardhat addFarmingPool --network avax --name AVAX_77.0_L_0605 --address 0xE1D05A01F05D0eBfe91063E05B27c0f5142C4690 --reward 0.035 --bonus 0.052
