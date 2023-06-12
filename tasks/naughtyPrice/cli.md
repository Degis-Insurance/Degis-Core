## #sd

---

---

---

npx hardhat addFarmingPool --network avaxTest --name DCAR_0.25_L_2007 --address 0xAEf14996b8d37bd5C7cbACDA06D101D85A89A58c --reward 0 --bonus 0 --doublereward 0x90ff1B7E4a1360f095fD03CbE9C2a63879fA32E2


## Deploy NP Token

# AVAX 
hh deployNPToken --network avax --name AVAX --stablecoin USDC --k 14.16 --namedecimals 2 --iscall 0 --round 1806 --deadline 1686816000 --settletime 1687075200 --type 0

hh deployNPToken --network avax --name AVAX --stablecoin USDC --k 14.16 --namedecimals 2 --iscall 1 --round 1806 --deadline 1686816000 --settletime 1687075200 --type 0

# XAVA
hh deployNPToken --network avax --name XAVA --stablecoin USDC --k 0.253 --namedecimals 3 --iscall 0 --round 1806 --deadline 1686816000 --settletime 1687075200 --type 0

hh deployNPToken --network avax --name XAVA --stablecoin USDC --k 0.253 --namedecimals 3 --iscall 1 --round 1806 --deadline 1686816000 --settletime 1687075200 --type 0

# JOE
hh deployNPToken --network avax --name JOE --stablecoin USDC --k 0.41 --namedecimals 2 --iscall 0 --round 1806 --deadline 1686816000 --settletime 1687075200 --type 0

hh deployNPToken --network avax --name JOE --stablecoin USDC --k 0.41 --namedecimals 2 --iscall 1 --round 1806 --deadline 1686816000 --settletime 1687075200 --type 0

# BTC
hh deployNPToken --network avax --name BTC --stablecoin USDC --k 27182.8 --namedecimals 1 --iscall 0 --round 1806 --deadline 1686816000 --settletime 1687075200 --type 0

hh deployNPToken --network avax --name BTC --stablecoin USDC --k 27182.8 --namedecimals 1 --iscall 1 --round 1806 --deadline 1686816000 --settletime 1687075200 --type 0

# CAI
hh deployNPToken --network avax --name CAI --stablecoin USDC --k 114.1 --namedecimals 1 --iscall 0 --round 1806 --deadline 1686816000 --settletime 1687075200 --type 1

hh deployNPToken --network avax --name CAI --stablecoin USDC --k 114.1 --namedecimals 1 --iscall 1 --round 1806 --deadline 1686816000 --settletime 1687075200 --type 1

# ETH
hh deployNPToken --network avax --name ETH --stablecoin USDC --k 1870.4 --namedecimals 1 --iscall 0 --round 1806 --deadline 1686816000 --settletime 1687075200 --type 0

hh deployNPToken --network avax --name ETH --stablecoin USDC --k 1870.4 --namedecimals 1 --iscall 1 --round 1806 --deadline 1686816000 --settletime 1687075200 --type 0