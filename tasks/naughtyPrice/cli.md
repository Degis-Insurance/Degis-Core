## #sd

---

---

---

npx hardhat addFarmingPool --network avaxTest --name DCAR_0.25_L_2007 --address 0xAEf14996b8d37bd5C7cbACDA06D101D85A89A58c --reward 0 --bonus 0 --doublereward 0x90ff1B7E4a1360f095fD03CbE9C2a63879fA32E2


## Deploy NP Token

npx hardhat deployNPToken --network avax --name AVAX --stablecoin USDC --k 18.1 --namedecimals 1 --iscall 0 --round 0503 --deadline 1677744000 --settletime 1678003200 --type 0

npx hardhat deployNPToken --network avax --name XAVA --stablecoin USDC --k 0.519 --namedecimals 3 --iscall 0 --round 0503 --deadline 1677744000 --settletime 1678003200 --type 0

npx hardhat deployNPToken --network avax --name JOE --stablecoin USDC --k 0.24 --namedecimals 2 --iscall 0 --round 0503 --deadline 1677744000 --settletime 1678003200 --type 0

npx hardhat deployNPToken --network avax --name BTC --stablecoin USDC --k 22120.9 --namedecimals 1 --iscall 0 --round 0503 --deadline 1677744000 --settletime 1678003200 --type 0

npx hardhat deployNPToken --network avax --name CAI --stablecoin USDC --k 97.74 --namedecimals 2 --iscall 0 --round 0503 --deadline 1677744000 --settletime 1678003200 --type 1

npx hardhat deployNPToken --network avax --name RoboVault --stablecoin USDC --k 1.034774 --namedecimals 6 --iscall 0 --round 0503 --deadline 1677744000 --settletime 1678003200 --type 2
