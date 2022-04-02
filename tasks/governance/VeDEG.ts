import { subtask, task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
// import hre from "hardhat";

import { FarmingPool, FarmingPool__factory } from "../../typechain";
import {
  readAddressList,
  readFarmingPoolList,
  storeFarmingPoolList,
} from "../../scripts/contractAddress";
import { parseUnits, formatEther } from "ethers/lib/utils";

const addressList = readAddressList();
const farmingPoolList = readFarmingPoolList();

task("setGenerationRate", "Set the generation rate of veDEG")
  .addParam("rate", "The generation rate", null, types.int)
  .setAction(async (taskArgs, hre) => {
    const startTimestamp = taskArgs.start;
    console.log("New start timestamp: ", startTimestamp);

    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The dfault signer is: ", dev_account.address);

  });
