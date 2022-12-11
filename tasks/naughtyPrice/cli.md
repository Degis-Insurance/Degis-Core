## #sd

---

---

---

npx hardhat addFarmingPool --network avaxTest --name DCAR_0.25_L_2007 --address 0xAEf14996b8d37bd5C7cbACDA06D101D85A89A58c --reward 0 --bonus 0 --doublereward 0x90ff1B7E4a1360f095fD03CbE9C2a63879fA32E2

npx hardhat deployNPToken --network avax --name AVAX --stablecoin Shield --k 14.0 --namedecimals 0 --iscall 0 --round 1912 --deadline 1671177600 --settletime 1671436800 --type 0

npx hardhat deployNPToken --network avax --name XAVA --stablecoin Shield --k 0.18 --namedecimals 2 --iscall 0 --round 1912 --deadline 1671177600 --settletime 1671436800 --type 0

npx hardhat deployNPToken --network avax --name JOE --stablecoin Shield --k 0.186 --namedecimals 3 --iscall 0 --round 1912 --deadline 1671177600 --settletime 1671436800 --type 0

npx hardhat deployNPToken --network avax --name BTC --stablecoin Shield --k 17259.6 --namedecimals 1 --iscall 0 --round 1912 --deadline 1671177600 --settletime 1671436800 --type 0

npx hardhat deployNPToken --network avax --name RoboVault --stablecoin Shield --k 1.029663 --namedecimals 6 --iscall 0 --round 1912 --deadline 1671177600 --settletime 1671436800 --type 2
