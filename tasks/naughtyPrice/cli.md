## #sd

---

---

---

npx hardhat addFarmingPool --network avaxTest --name DCAR_0.25_L_2007 --address 0xAEf14996b8d37bd5C7cbACDA06D101D85A89A58c --reward 0 --bonus 0 --doublereward 0x90ff1B7E4a1360f095fD03CbE9C2a63879fA32E2

npx hardhat deployNPToken --network avax --name AVAX --stablecoin Shield --k 11.97 --namedecimals 2 --iscall 0 --round 0701 --deadline 1672819200 --settletime 1673078400 --type 0

npx hardhat deployNPToken --network avax --name XAVA --stablecoin Shield --k 0.153 --namedecimals 3 --iscall 0 --round 0701 --deadline 1672819200 --settletime 1673078400 --type 0

npx hardhat deployNPToken --network avax --name JOE --stablecoin Shield --k 0.144 --namedecimals 3 --iscall 0 --round 0701 --deadline 1672819200 --settletime 1673078400 --type 0

npx hardhat deployNPToken --network avax --name BTC --stablecoin Shield --k 16812.1 --namedecimals 1 --iscall 0 --round 0701 --deadline 1672819200 --settletime 1673078400 --type 0

npx hardhat deployNPToken --network avax --name RoboVault --stablecoin Shield --k 1.031094 --namedecimals 6 --iscall 0 --round 0701 --deadline 1672819200 --settletime 1673078400 --type 2
