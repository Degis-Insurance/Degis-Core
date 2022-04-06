import { subtask, task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
// import hre from "hardhat";

import {
  FarmingPool,
  FarmingPool__factory,
  VoteEscrowedDegis,
  VoteEscrowedDegis__factory,
} from "../../typechain";
import {
  readAddressList,
  readFarmingPoolList,
  storeFarmingPoolList,
} from "../../scripts/contractAddress";
import { parseUnits, formatEther } from "ethers/lib/utils";

const addressList = readAddressList();
const farmingPoolList = readFarmingPoolList();

task("setGenerationRate", "Set the generation rate of veDEG")
  .addParam("rate", "The generation rate", null, types.string)
  .setAction(async (taskArgs, hre) => {
    const startTimestamp = taskArgs.start;
    console.log("New start timestamp: ", startTimestamp);

    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The dfault signer is: ", dev_account.address);

    const veAddress = addressList[network.name].VoteEscrowedDegis;

    const VeDEG: VoteEscrowedDegis__factory =
      await hre.ethers.getContractFactory("VoteEscrowedDegis");
    const veDEG: VoteEscrowedDegis = VeDEG.attach(veAddress);

    const tx = await veDEG.setGenerationRate(parseUnits(taskArgs.rate));
    console.log("tx details: ", await tx.wait());
  });
