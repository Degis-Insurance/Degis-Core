import { subtask, task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
// import hre from "hardhat";

import { FarmingPool, FarmingPool__factory } from "../../typechain";
import { readAddressList } from "../../scripts/contractAddress";
import { parseUnits, formatEther } from "ethers/lib/utils";

task("addFarmingPool", "Add new farming pool")
  .addParam("address", "The pool's address to be added", null, types.string)
  .addParam("reward", "Initial degis reward per block", null, types.int)
  .setAction(async (taskArgs, hre) => {
    const lptokenAddress = taskArgs.address;
    const degisPerBlock = taskArgs.reward;
    console.log("Pool address to be added: ", lptokenAddress);
    console.log("Reward speed: ", degisPerBlock, "degis/block");

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

    const tx = await farmingPool.add(
      lptokenAddress,
      parseUnits(degisPerBlock.toString()),
      false
    );
    console.log("tx details: ", await tx.wait());

    // Check the result
    const poolId = await farmingPool.poolMapping(lptokenAddress);
    const poolInfo = await farmingPool.poolList(poolId);
    console.log("Pool info: ", poolInfo);
  });

task("setFarmingPoolDegisReward", "Set the degis reward of a farming pool")
  .addParam("id", "Pool id", null, types.int)
  .addParam("reward", "Degis reward per block", null, types.int)
  .setAction(async (taskArgs, hre) => {
    // Get the args
    const poolId = taskArgs.id;
    const degisPerBlock = taskArgs.reward;
    console.log("Pool id to be set: ", poolId);
    console.log("New reward speed: ", degisPerBlock, "degis/block");

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
    const tx = await farmingPool.setDegisReward(
      poolId,
      parseUnits(degisPerBlock.toString()),
      false
    );
    console.log("Tx details: ", await tx.wait());

    // Check the result
    const poolInfo = await farmingPool.poolList(poolId);
    console.log(
      "Degis reward after set: ",
      formatEther(poolInfo.degisPerBlock)
    );
  });

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
