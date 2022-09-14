## #sd

---

---

---


npx hardhat addFarmingPool --network avaxTest --name DCAR_0.25_L_2007 --address 0xAEf14996b8d37bd5C7cbACDA06D101D85A89A58c --reward 0 --bonus 0 --doublereward 0x90ff1B7E4a1360f095fD03CbE9C2a63879fA32E2

npx hardhat deployNPToken --network avax --name AVAX --stablecoin USDC.e --k 21.7 --namedecimals 1 --iscall 0 --round 0110 --deadline 1664352000 --settletime 1664611200 --ido false

npx hardhat deployNPToken --network avax --name XAVA --stablecoin USDC.e --k 0.4 --namedecimals 1 --iscall 0 --round 0110 --deadline 1664352000 --settletime 1664611200 --ido false

npx hardhat deployNPToken --network avax --name JOE --stablecoin USDC.e --k 0.24 --namedecimals 2 --iscall 0 --round 0110 --deadline 1664352000 --settletime 1664611200 --ido false

npx hardhat deployNPToken --network avax --name BTC --stablecoin USDC.e --k 22290.0 --namedecimals 0 --iscall 0 --round 0110 --deadline 1664352000 --settletime 1664611200 --ido false