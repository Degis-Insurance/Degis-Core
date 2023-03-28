## #sd

---

---

---

npx hardhat addFarmingPool --network avaxTest --name DCAR_0.25_L_2007 --address 0xAEf14996b8d37bd5C7cbACDA06D101D85A89A58c --reward 0 --bonus 0 --doublereward 0x90ff1B7E4a1360f095fD03CbE9C2a63879fA32E2


## Deploy NP Token

npx hardhat deployNPToken --network avax --name AVAX --stablecoin USDC --k 16.6 --namedecimals 1 --iscall 0 --round 1504 --deadline 1681286400 --settletime 1681545600 --type 0

npx hardhat deployNPToken --network avax --name XAVA --stablecoin USDC --k 0.404 --namedecimals 3 --iscall 0 --round 1504 --deadline 1681286400 --settletime 1681545600 --type 0

npx hardhat deployNPToken --network avax --name JOE --stablecoin USDC --k 0.57 --namedecimals 2 --iscall 0 --round 1504 --deadline 1681286400 --settletime 1681545600 --type 0

npx hardhat deployNPToken --network avax --name BTC --stablecoin USDC --k 27022.8 --namedecimals 1 --iscall 0 --round 1504 --deadline 1681286400 --settletime 1681545600 --type 0

npx hardhat deployNPToken --network avax --name CAI --stablecoin USDC --k 138.81 --namedecimals 2 --iscall 0 --round 1504 --deadline 1681286400 --settletime 1681545600 --type 1

npx hardhat deployNPToken --network avax --name ETH --stablecoin USDC --k 1728.55 --namedecimals 2 --iscall 0 --round 1504 --deadline 1681286400 --settletime 1681545600 --type 0

npx hardhat deployNPToken --network avax --name RoboVault --stablecoin USDC --k 1.034774 --namedecimals 6 --iscall 0 --round 1504 --deadline 1681286400 --settletime 1681545600 --type 2
