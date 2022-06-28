## #sd

---

---

---

npx hardhat deployNPToken --network avax --name XAVA --stablecoin USDC.e --k 0.62 --namedecimals 2 --iscall 0 --round 1307 --deadline 1657612800 --settletime 1657699200 --ido false

npx hardhat deployNPToken --network avaxTest --name JOE --stablecoin USDC.e --k 0.27 --namedecimals 2 --iscall 0 --round 2806 --deadline 1656417600 --settletime 1656419400 --ido true

npx hardhat deployNPToken --network avaxTest --name XAVA --stablecoin USDC.e --k 0.29--namedecimals 2 --iscall 0 --round 2806 --deadline 1656304200 --settletime 1656304320 --ido false

npx hardhat deployNPPool --network fuji --name AVAX_32.0_L_3006 --stablecoin USDC.e --deadline 1656576000 --fee 50

npx hardhat addFarmingPool --network avax --name AVAX_77.0_L_0605 --address 0xE1D05A01F05D0eBfe91063E05B27c0f5142C4690 --reward 0.035 --bonus 0.052

npx hardhat deployNPToken --network fuji --name AVAX --stablecoin USDC.e --k 1.0 --namedecimals 0 --iscall 0 --round 8896 --deadline 1656258300 --settletime 1656258300 --ido true
