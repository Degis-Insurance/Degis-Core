## #sd

---

---

---

npx hardhat deployNPToken --network fuji --name AVAX --stablecoin x --k 34.0 --namedecimals 0 --iscall 0 --round 2105 --deadline 1653033600 --settletime 1653120000

npx hardhat deployNPPool --network fuji --name AVAX_34.0_L_2105 --stablecoin USDC.e --deadline 1652688000 --fee 50

npx hardhat addFarmingPool --network avax --name AVAX_77.0_L_0605 --address 0xE1D05A01F05D0eBfe91063E05B27c0f5142C4690 --reward 0.035 --bonus 0.052
