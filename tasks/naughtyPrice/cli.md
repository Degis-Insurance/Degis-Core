## #sd

---

---

---

npx hardhat deployNPToken --network fuji --name AVAX --stablecoin x --k 32.0 --namedecimals 0 --iscall 0 --round 2205 --deadline 1653121800 --settletime 1653208200

npx hardhat deployNPPool --network fuji --name AVAX_33.0_L_2205 --stablecoin USDC.e --deadline 1653121800 --fee 50

npx hardhat addFarmingPool --network avax --name AVAX_77.0_L_0605 --address 0xE1D05A01F05D0eBfe91063E05B27c0f5142C4690 --reward 0.035 --bonus 0.052
