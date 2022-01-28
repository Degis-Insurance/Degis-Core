import { task, types } from "hardhat/config";

task("deployNPPool", "Deploy the swapping pool of naughty price policy token")
  .addParam("name", "Policy token name", null, types.string)
  .addParam("stablecoin", "Address of the stablecoin", null, types.string)
  .addParam("deadline", "Deadline of the swapping pool", null, types.string)
  .addParam("fee", "LP fee rate of the pool", 0, types.int)
  .setAction(async (taskArgs, hre) => {
    const { network } = hre;
  });
