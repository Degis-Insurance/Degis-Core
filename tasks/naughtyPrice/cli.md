## #sd

---

---

---

npx hardhat deployNPToken --network avaxTest --name AVAX --stablecoin USDC.e --k 85.0 --namedecimals 0 --iscall 0 --round 2903 --deadline 1648440000 --settletime 1648526400

npx hardhat deployNPPool --network avaxTest --name AVAX_85.0_L_2903 --stablecoin USDC.e --deadline 1648440000 --fee 50

npx hardhat addFarmingPool --network avaxTest --name AVAX_85.0_L_2903 --address 0x023737a366aC87EA4b5CBb9CA3f9710e41Cd7496 --reward 1 --bonus 0
