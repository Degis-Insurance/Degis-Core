## #sd

---

---

---

npx hardhat deployNPToken --network fuji --name AVAX --stablecoin USDC.e --k 72.0 --namedecimals 0 --iscall 0 --round 0105 --deadline 1651392000 --settletime 1651392000

npx hardhat deployNPPool --network fuji --name AVAX_72.0_L_0105 --stablecoin USDC.e --deadline 1651392000 --fee 50

npx hardhat addFarmingPool --network avax --name AVAX_77.0_L_0605 --address 0xE1D05A01F05D0eBfe91063E05B27c0f5142C4690 --reward 0.035 --bonus 0.052
