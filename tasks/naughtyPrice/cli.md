## #sd

---

---

---

npx hardhat deployNPToken --network avax --name AVAX --stablecoin USDC.e --k 94.0 --namedecimals 0 --iscall 0 --round 2104 --deadline 1650096000 --settletime 1650528000

npx hardhat deployNPPool --network avax --name AVAX_94.0_L_2104 --stablecoin USDC.e --deadline 1650096000 --fee 50

npx hardhat addFarmingPool --network avax --name AVAX_94.0_L_2104 --address 0xA0dA9378e0284440EDeaE49B54f11f4bC20c2C4c --reward 0.11574 --bonus 0
