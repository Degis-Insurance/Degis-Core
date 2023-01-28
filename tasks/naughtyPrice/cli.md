## #sd

---

---

---

npx hardhat addFarmingPool --network avaxTest --name DCAR_0.25_L_2007 --address 0xAEf14996b8d37bd5C7cbACDA06D101D85A89A58c --reward 0 --bonus 0 --doublereward 0x90ff1B7E4a1360f095fD03CbE9C2a63879fA32E2

npx hardhat deployNPToken --network avax --name AVAX --stablecoin USDC --k 20.56 --namedecimals 2 --iscall 0 --round 1502 --deadline 1676188800 --settletime 1676448000 --type 0

npx hardhat deployNPToken --network avax --name XAVA --stablecoin USDC --k 0.446 --namedecimals 3 --iscall 0 --round 1502 --deadline 1676188800 --settletime 1676448000 --type 0

npx hardhat deployNPToken --network avax --name JOE --stablecoin USDC --k 0.224 --namedecimals 3 --iscall 0 --round 1502 --deadline 1676188800 --settletime 1676448000 --type 0

npx hardhat deployNPToken --network avax --name BTC --stablecoin USDC --k 23010.2 --namedecimals 1 --iscall 0 --round 1502 --deadline 1676188800 --settletime 1676448000 --type 0

npx hardhat deployNPToken --network avax --name CAI --stablecoin USDC --k 99.87 --namedecimals 2 --iscall 0 --round 1502 --deadline 1676188800 --settletime 1676448000 --type 1

npx hardhat deployNPToken --network avax --name RoboVault --stablecoin USDC --k 1.034774 --namedecimals 6 --iscall 0 --round 1502 --deadline 1676188800 --settletime 1676448000 --type 2
