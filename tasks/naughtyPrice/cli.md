## #sd

---

---

---

npx hardhat deployNPToken --network avaxTest --name AVAX --stablecoin USDC.e --k 84.0 --namedecimals 0 --iscall 0 --round 2104 --deadline 1650096000 --settletime 1650528000

npx hardhat deployNPPool --network avaxTest --name AVAX_84.0_L_2104 --stablecoin USDC.e --deadline 1650096000 --fee 50

npx hardhat addFarmingPool --network avaxTest --name AVAX_84.0_L_2104 --address 0x2c4086e3Afd6E780d5173E68B22320284f44129d --reward 0.11574 --bonus 0.11574
