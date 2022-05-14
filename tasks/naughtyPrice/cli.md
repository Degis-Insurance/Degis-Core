## #sd

---

---

---

npx hardhat deployNPToken --network avax --name AVAX --stablecoin USDC.e --k 58.0 --namedecimals 0 --iscall 0 --round 1705 --deadline 1652688000 --settletime 1652774400

npx hardhat deployNPPool --network avax --name AVAX_58.0_L_1705 --stablecoin USDC.e --deadline 1652688000 --fee 50

npx hardhat addFarmingPool --network avax --name AVAX_77.0_L_0605 --address 0xE1D05A01F05D0eBfe91063E05B27c0f5142C4690 --reward 0.035 --bonus 0.052
