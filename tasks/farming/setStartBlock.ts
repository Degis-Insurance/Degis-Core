import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
// import hre from "hardhat";

import { FarmingPool, FarmingPool__factory } from "../../typechain";
import { readAddressList } from "../../scripts/contractAddress";

task("setFarmingStartBlock", "Set the start block of farming")
  .addParam("start", "The start block", null, types.int)
  .setAction(async (taskArgs, hre) => {
    const startBlock = taskArgs.start;
    console.log("Pool address to be added: ", startBlock);

    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The dfault signer is: ", dev_account.address);

    const addressList = readAddressList();
    const farmingPoolAddress = addressList[network.name].FarmingPool;

    console.log(
      "The farming pool address of this network is: ",
      farmingPoolAddress
    );

    const FarmingPool: FarmingPool__factory =
      await hre.ethers.getContractFactory("FarmingPool");
    const farmingPool: FarmingPool = FarmingPool.attach(farmingPoolAddress);

    // Set the start block
    const tx = await farmingPool.setStartBlock(startBlock);
    console.log("Tx details: ", await tx.wait());

    // Check the result
    const startBlockResult = await farmingPool.startBlock();
    console.log("Start block for farming: ", startBlockResult.toNumber());
  });
