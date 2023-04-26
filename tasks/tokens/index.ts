import { task } from "hardhat/config";

import { addMinterBurnerAction } from "./addMinterBurner";
import { addMinterBurnerWithAddressAction } from "./addMinterBurnerWithAddress";
import { mintBuyerTokenAction } from "./mintBuyerToken";
import { mintDegisTokenAction } from "./mintDegisToken";
import { mintMockUSDAction } from "./mintMockUSD";
import { removeMinterBurnerAction } from "./removeMinterBurner";

// hh addMinterBurner --type minter --token d --name StakingPoolFactory --network avax
task(
  "addMinterBurner",
  "Add a new address to be DEG/BuyerToken's minter or burner",
  addMinterBurnerAction
)
  .addParam("type", "add minter or burner")
  .addParam("token", "DEG token or Buyer token")
  .addParam(
    "name",
    "name of the contract to be added as minter or burner(this contract must be stored in address.json before"
  );

// hh removeMinterBurner --type minter --token d --name StakingPoolFactory --network avax
task(
  "removeMinterBurner",
  "Remove an address from DEG/BuyerToken's minter or burner",
  removeMinterBurnerAction
)
  .addParam("type", "add minter or burner")
  .addParam("token", "DEG token or Buyer token")
  .addParam(
    "name",
    "name of the contract to be added as minter or burner(this contract must be stored in address.json before"
  );

// hh mintBuyerToken --network goerli --address 0x1234 --amount 10
task("mintBuyerToken", "Mint BuyerToken to an address", mintBuyerTokenAction)
  .addParam("address", "Mint buyer token to this address")
  .addParam("amount", "Amount of buyer token to mint(no decimals, 1 = 1e18)");

// hh mintDegisToken --network goerli --address 0x1234 --amount 10
task("mintDegisToken", "Mint DegisToken to an address", mintDegisTokenAction)
  .addParam("address", "Mint degis token to this address")
  .addParam("amount", "Amount of degis token to mint(no decimals, 1 = 1e18)");

task("mintMockUSD", "Mint mock usd token to an address", mintMockUSDAction)
  .addParam("address", "Mint mock usd token to this address")
  .addParam("amount", "Amount of mock usd token to mint(no decimals, 1 = 1e6)");

task(
  "addMinterBurnerWithAddress",
  "add minter/burner manually",
  addMinterBurnerWithAddressAction
)
  .addParam("type", "minter or burner")
  .addParam("token", "Which token")
  .addParam("address", "new minter/burner address");
