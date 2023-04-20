## #sd

---

---

---

npx hardhat addFarmingPool --network avaxTest --name DCAR_0.25_L_2007 --address 0xAEf14996b8d37bd5C7cbACDA06D101D85A89A58c --reward 0 --bonus 0 --doublereward 0x90ff1B7E4a1360f095fD03CbE9C2a63879fA32E2


## Deploy NP Token

hh deployNPToken --network avax --name AVAX --stablecoin USDC --k 20.55 --namedecimals 2 --iscall 0 --round 0505 --deadline 1683014400 --settletime 1683273600 --type 0

hh deployNPToken --network avax --name XAVA --stablecoin USDC --k 0.427 --namedecimals 3 --iscall 0 --round 0505 --deadline 1683014400 --settletime 1683273600 --type 0

hh deployNPToken --network avax --name JOE --stablecoin USDC --k 0.63 --namedecimals 2 --iscall 0 --round 0505 --deadline 1683014400 --settletime 1683273600 --type 0

hh deployNPToken --network avax --name BTC --stablecoin USDC --k 29890.5 --namedecimals 1 --iscall 0 --round 0505 --deadline 1683014400 --settletime 1683273600 --type 0

hh deployNPToken --network avax --name CAI --stablecoin USDC --k 164.1 --namedecimals 1 --iscall 0 --round 0505 --deadline 1683014400 --settletime 1683273600 --type 1

hh deployNPToken --network avax --name ETH --stablecoin USDC --k 2091.6 --namedecimals 1 --iscall 0 --round 0505 --deadline 1683014400 --settletime 1683273600 --type 0
