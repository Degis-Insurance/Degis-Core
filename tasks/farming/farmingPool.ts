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

task("addFarmingPool", "Add new farming pool")
  .addParam("name", "The name of the new farming pool", "unnamed", types.string)
  .addParam("address", "The pool's address to be added", null, types.string)
  .addParam("reward", "Initial degis reward per second", null, types.string)
  .addParam("bonus", "Bonus degis reward per second", null, types.string)
  .setAction(async (taskArgs, hre) => {
    const poolName = taskArgs.name;
    const lptokenAddress = taskArgs.address;
    const basicDegisPerSecond = taskArgs.reward;
    const bonusDegisPerSecond = taskArgs.bonus;

    console.log("The pool name is: ", poolName);
    console.log("Pool address to be added: ", lptokenAddress);
    console.log("Basic reward speed: ", basicDegisPerSecond, "degis/second");
    console.log("Bonus reward speed: ", bonusDegisPerSecond, "degis/second");

    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The dfault signer is: ", dev_account.address);

    const farmingPoolAddress = addressList[network.name].FarmingPoolUpgradeable;
    console.log(
      "The farming pool address of ",
      network.name,
      " is: ",
      farmingPoolAddress
    );
    const FarmingPool: FarmingPool__factory =
      await hre.ethers.getContractFactory("FarmingPoolUpgradeable");
    const farmingPool: FarmingPool = FarmingPool.attach(farmingPoolAddress);

    console.log("farming speed", parseUnits(basicDegisPerSecond).toString());

    const tx = await farmingPool.add(
      lptokenAddress,
      parseUnits(basicDegisPerSecond),
      parseUnits(bonusDegisPerSecond),
      false
    );
    console.log("tx details: ", await tx.wait());

    // Check the result
    const poolId = await farmingPool.poolMapping(lptokenAddress);
    const poolInfo = await farmingPool.poolList(poolId);
    console.log("Pool info: ", poolInfo);

    // Store the new farming pool
    const poolObject = {
      name: poolName,
      address: lptokenAddress,
      poolId: poolId.toNumber(),
      reward: formatEther(poolInfo.basicDegisPerSecond),
      bonus: formatEther(poolInfo.bonusDegisPerSecond),
    };
    farmingPoolList[network.name][poolId.toNumber()] = poolObject;

    console.log("Farming pool list now: ", farmingPoolList);
    storeFarmingPoolList(farmingPoolList);
  });

task("setFarmingPoolDegisReward", "Set the degis reward of a farming pool")
  .addParam("id", "Pool id", null, types.int)
  .addParam("reward", "Basic Degis reward per second", null, types.int)
  .addParam("bonus", "Bonus reward per second", null, types.int)
  .setAction(async (taskArgs, hre) => {
    // Get the args
    const poolId = taskArgs.id;
    const basicDegisPerSecond = taskArgs.reward;
    const bonusDegisPerSecond = taskArgs.bonus;

    console.log("Pool id to be set: ", poolId);
    console.log("New reward speed: ", basicDegisPerSecond, "degis/second");
    console.log("New Bonus speed: ", bonusDegisPerSecond, "degis/second");

    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The dfault signer is: ", dev_account.address);

    const farmingPoolAddress = addressList[network.name].FarmingPoolUpgradeable;
    console.log(
      "The farming pool address of ",
      network.name,
      " is: ",
      farmingPoolAddress
    );
    const FarmingPool: FarmingPool__factory =
      await hre.ethers.getContractFactory("FarmingPoolUpgradeable");
    const farmingPool: FarmingPool = FarmingPool.attach(farmingPoolAddress);

    // Set the start block
    const tx = await farmingPool.setDegisReward(
      poolId,
      parseUnits(basicDegisPerSecond.toString()),
      parseUnits(bonusDegisPerSecond.toString()),
      false
    );
    console.log("Tx hash: ", (await tx.wait()).transactionHash);

    // Check the result
    const poolInfo = await farmingPool.poolList(poolId);
    console.log(
      "Degis reward after set: basic - ",
      formatEther(poolInfo.basicDegisPerSecond),
      " bonus - ",
      formatEther(poolInfo.bonusDegisPerSecond)
    );

    // Store the new farming pool
    farmingPoolList[network.name][poolId].reward = formatEther(
      poolInfo.basicDegisPerSecond
    );
    farmingPoolList[network.name][poolId].bonus = formatEther(
      poolInfo.bonusDegisPerSecond
    );
    console.log("Farming pool list now: ", farmingPoolList);
    storeFarmingPoolList(farmingPoolList);
  });

task("setFarmingStartTime", "Set the start timestamp of farming")
  .addParam("start", "The start timestamp", null, types.int)
  .setAction(async (taskArgs, hre) => {
    const startTimestamp = taskArgs.start;
    console.log("New start timestamp: ", startTimestamp);

    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The dfault signer is: ", dev_account.address);

    const farmingPoolAddress = addressList[network.name].FarmingPoolUpgradeable;
    console.log(
      "The farming pool address of this network is: ",
      farmingPoolAddress
    );

    const FarmingPool: FarmingPool__factory =
      await hre.ethers.getContractFactory("FarmingPoolUpgradeable");
    const farmingPool: FarmingPool = FarmingPool.attach(farmingPoolAddress);

    // Set the start block
    const tx = await farmingPool.setStartTimestamp(startTimestamp);
    console.log("Tx details: ", await tx.wait());

    // Check the result
    const startBlockResult = await farmingPool.startTimestamp();
    console.log("Start block for farming: ", startBlockResult.toNumber());
  });

task("setVeDEG", "Set the VeDEG of a farming pool")
  .addParam("ve", "VeDEG", null, types.string)
  .setAction(async (taskArgs, hre) => {
    const veDEGAddress = taskArgs.ve;

    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The dfault signer is: ", dev_account.address);

    const farmingPoolAddress = addressList[network.name].FarmingPoolUpgradeable;
    console.log(
      "The farming pool address of this network is: ",
      farmingPoolAddress
    );

    const FarmingPool: FarmingPool__factory =
      await hre.ethers.getContractFactory("FarmingPoolUpgradeable");
    const farmingPool: FarmingPool = FarmingPool.attach(farmingPoolAddress);

    const tx = await farmingPool.setVeDEG(veDEGAddress);
    console.log("Tx details: ", await tx.wait());
  });
