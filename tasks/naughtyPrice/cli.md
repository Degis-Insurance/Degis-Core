## #sd

---

---

---

npx hardhat deployNPToken --network avax --name AVAX --stablecoin USDC.e --k 77.0 --namedecimals 0 --iscall 0 --round 0605 --deadline 1651392000 --settletime 1651824000

npx hardhat deployNPPool --network avax --name AVAX_77.0_L_0605 --stablecoin USDC.e --deadline 1651392000 --fee 50

npx hardhat addFarmingPool --network avax --name AVAX_77.0_L_0605 --address 0xE1D05A01F05D0eBfe91063E05B27c0f5142C4690 --reward 0.035 --bonus 0.052
