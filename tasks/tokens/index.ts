import { task } from "hardhat/config";

import { addMinterBurnerAction } from "./addMinterBurner";
import { mintBuyerTokenAction } from "./mintBuyerToken";
import { mintDegisTokenAction } from "./mintDegisToken";
import { removeMinterBurnerAction } from "./removeMinterBurner";

// npx hardhat addMinterBurner --type minter --token d --name StakingPoolFactory --network avax
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

// npx hardhat removeMinterBurner --type minter --token d --name StakingPoolFactory --network avax
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

task("mintBuyerToken", "Mint BuyerToken to an address", mintBuyerTokenAction)
  .addParam("address", "minter or burner")
  .addParam("amount", "Which token");

task("mintDegisToken", "Mint DegisToken to an address", mintDegisTokenAction)
  .addParam("address", "minter or burner")
  .addParam("amount", "Which token");
