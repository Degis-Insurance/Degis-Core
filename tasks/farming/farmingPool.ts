import { subtask, task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import {
  DoubleRewarder,
  DoubleRewarder__factory,
  FarmingPoolUpgradeable,
  FarmingPoolUpgradeable__factory,
  MockERC20,
  MockERC20__factory,
} from "../../typechain";
import {
  readAddressList,
  readFarmingPoolList,
  storeFarmingPoolList,
} from "../../scripts/contractAddress";
import { parseUnits, formatEther } from "ethers/lib/utils";
import { stablecoinToWei, toWei } from "../../test/utils";

const addressList = readAddressList();
const farmingPoolList = readFarmingPoolList();

task("addFarmingPool", "Add new farming pool")
  .addParam("name", "The name of the new farming pool", "unnamed", types.string)
  .addParam("address", "The pool's address to be added", null, types.string)
  .addParam("reward", "Initial degis reward per second", null, types.string)
  .addParam("bonus", "Bonus degis reward per second", null, types.string)
  .addParam("doublereward", "Double reward token address", null, types.string)
  .setAction(async (taskArgs, hre) => {
    const poolName = taskArgs.name;
    const lptokenAddress = taskArgs.address;
    const basicDegisPerSecond = taskArgs.reward;
    const bonusDegisPerSecond = taskArgs.bonus;
    const doubleRewardTokenAddress =
      taskArgs.doublereward == "0"
        ? ethers.constants.AddressZero
        : taskArgs.doublereward;

    console.log("The pool name is: ", poolName);
    console.log("Pool address to be added: ", lptokenAddress);
    console.log("Basic reward speed: ", basicDegisPerSecond, "degis/second");
    console.log("Bonus reward speed: ", bonusDegisPerSecond, "degis/second");
    console.log("Double reward token address: ", doubleRewardTokenAddress);

    const { network, addressList, dev_account } = await hre.run("preparation");

    const farmingPoolAddress = addressList[network.name].FarmingPoolUpgradeable;
    console.log(
      "The farming pool address of ",
      network.name,
      " is: ",
      farmingPoolAddress
    );

    const farmingPool: FarmingPoolUpgradeable =
      new FarmingPoolUpgradeable__factory(dev_account).attach(
        farmingPoolAddress
      );

    console.log(
      "farming basic speed",
      parseUnits(basicDegisPerSecond).toString()
    );
    console.log(
      "farming bonus speed",
      parseUnits(bonusDegisPerSecond).toString()
    );

    console.log("New reward speed: ", basicDegisPerSecond * 86400, "degis/day");
    console.log("New Bonus speed: ", bonusDegisPerSecond * 86400, "degis/day");

    const tx = await farmingPool.add(
      lptokenAddress,
      parseUnits(basicDegisPerSecond),
      parseUnits(bonusDegisPerSecond),
      false,
      doubleRewardTokenAddress
    );
    console.log("tx details: ", await tx.wait());

    // Check the result
    const poolId = await farmingPool.poolMapping(lptokenAddress);
    const poolInfo = await farmingPool.poolList(poolId);
    console.log("Pool info: ", poolInfo);

    const doubleReward = await farmingPool.doubleRewarder(poolId);

    // Store the new farming pool
    const poolObject = {
      name: poolName,
      address: lptokenAddress,
      poolId: poolId.toNumber(),
      reward: formatEther(poolInfo.basicDegisPerSecond),
      bonus: formatEther(poolInfo.bonusDegisPerSecond),
      doubleRewardTokenAddress: doubleReward,
    };
    farmingPoolList[network.name][poolId.toNumber()] = poolObject;

    console.log("Farming pool list now: ", farmingPoolList);
    storeFarmingPoolList(farmingPoolList);
  });

task("setFarmingPoolDegisReward", "Set the degis reward of a farming pool")
  .addParam("id", "Pool id", null, types.int)
  .addParam("reward", "Basic Degis reward per second", null, types.string)
  .addParam("bonus", "Bonus reward per second", null, types.string)
  .setAction(async (taskArgs, hre) => {
    // Get the args
    const poolId = taskArgs.id;
    const basicDegisPerSecond = taskArgs.reward;
    const bonusDegisPerSecond = taskArgs.bonus;

    console.log("Pool id to be set: ", poolId);
    console.log("New reward speed: ", basicDegisPerSecond * 86400, "degis/day");
    console.log("New Bonus speed: ", bonusDegisPerSecond * 86400, "degis/day");

    const { network, addressList, dev_account } = await hre.run("preparation");

    const farmingPoolAddress = addressList[network.name].FarmingPoolUpgradeable;
    console.log(
      "The farming pool address of ",
      network.name,
      " is: ",
      farmingPoolAddress
    );
    const FarmingPool: FarmingPoolUpgradeable__factory =
      await hre.ethers.getContractFactory("FarmingPoolUpgradeable");
    const farmingPool: FarmingPoolUpgradeable =
      FarmingPool.attach(farmingPoolAddress);

    // Set the start block
    const tx = await farmingPool.setDegisReward(
      poolId,
      parseUnits(basicDegisPerSecond),
      parseUnits(bonusDegisPerSecond),
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

    const { network, addressList, dev_account } = await hre.run("preparation");

    const farmingPoolAddress = addressList[network.name].FarmingPoolUpgradeable;
    console.log(
      "The farming pool address of this network is: ",
      farmingPoolAddress
    );

    const FarmingPool: FarmingPoolUpgradeable__factory =
      await hre.ethers.getContractFactory("FarmingPoolUpgradeable");
    const farmingPool: FarmingPoolUpgradeable =
      FarmingPool.attach(farmingPoolAddress);

    // Set the start block
    const tx = await farmingPool.setStartTimestamp(startTimestamp);
    console.log("Tx details: ", await tx.wait());

    // Check the result
    const startBlockResult = await farmingPool.startTimestamp();
    console.log("Start block for farming: ", startBlockResult.toNumber());
  });

task("setVeDEG", "Set the VeDEG of a farming pool").setAction(
  async (_, hre) => {
    const { network, addressList, dev_account } = await hre.run("preparation");

    const farmingPoolAddress = addressList[network.name].FarmingPoolUpgradeable;
    console.log(
      "The farming pool address of this network is: ",
      farmingPoolAddress
    );

    const veDEGAddress = addressList[network.name].VoteEscrowedDegis;

    const FarmingPool: FarmingPoolUpgradeable__factory =
      await hre.ethers.getContractFactory("FarmingPoolUpgradeable");
    const farmingPool: FarmingPoolUpgradeable =
      FarmingPool.attach(farmingPoolAddress);

    const tx = await farmingPool.setVeDEG(veDEGAddress);
    console.log("Tx details: ", await tx.wait());
  }
);

task("setPieceWise-Farming", "Set piecewise reward level for farming")
  .addParam("pid", "Pool id", null, types.int)
  .setAction(async (taskArgs, hre) => {
    const poolId = taskArgs.pid;
    const threshold: string[] = [
      stablecoinToWei("0"),
      stablecoinToWei("150000"),
      stablecoinToWei("300000"),
      stablecoinToWei("450000"),
      stablecoinToWei("600000"),
      stablecoinToWei("750000"),
    ];

    const reward: string[] = [
      toWei("0.03472"),
      toWei("0.06944"),
      toWei("0.08101"),
      toWei("0.09259"),
      toWei("0.10417"),
      toWei("0.11574"),
    ];

    const { network, addressList, dev_account } = await hre.run("preparation");

    const farmingPoolAddress = addressList[network.name].FarmingPoolUpgradeable;
    console.log(
      "The farming pool address of this network is: ",
      farmingPoolAddress
    );

    const FarmingPool: FarmingPoolUpgradeable__factory =
      await hre.ethers.getContractFactory("FarmingPoolUpgradeable");
    const farmingPool: FarmingPoolUpgradeable =
      FarmingPool.attach(farmingPoolAddress);

    const tx = await farmingPool.setPiecewise(poolId, threshold, reward, {
      gasLimit: 1000000,
      from: dev_account.address,
    });
    console.log("Tx details: ", await tx.wait());

    const thresholdBasic = await farmingPool.thresholdBasic(poolId, 1);
    console.log("Threshold basic: ", thresholdBasic.toString());
  });

task("stopPieceWise-Farming", "Stop piecewise reward level for farming")
  .addParam("pid", "Pool id", null, types.int)
  .setAction(async (taskArgs, hre) => {
    const poolId = taskArgs.pid;

    const threshold: string[] = ["0"];

    const reward: string[] = ["0"];

    const { network, addressList, dev_account } = await hre.run("preparation");

    const farmingPoolAddress = addressList[network.name].FarmingPoolUpgradeable;
    console.log(
      "The farming pool address of this network is: ",
      farmingPoolAddress
    );

    const FarmingPool: FarmingPoolUpgradeable__factory =
      await hre.ethers.getContractFactory("FarmingPoolUpgradeable");
    const farmingPool: FarmingPoolUpgradeable =
      FarmingPool.attach(farmingPoolAddress);

    const tx = await farmingPool.setPiecewise(poolId, threshold, reward, {
      gasLimit: 1000000,
      from: dev_account.address,
    });
    console.log("Tx details: ", await tx.wait());

    const thresholdBasic = await farmingPool.thresholdBasic(poolId, 0);
    console.log("Threshold basic: ", thresholdBasic.toString());
  });

task("setVeDEGInFarming", "Set the VeDEG of a farming pool").setAction(
  async (taskArgs, hre) => {
    const { network, addressList, dev_account } = await hre.run("preparation");

    const farmingPoolAddress = addressList[network.name].FarmingPoolUpgradeable;
    console.log(
      "The farming pool address of this network is: ",
      farmingPoolAddress
    );

    const FarmingPool: FarmingPoolUpgradeable__factory =
      await hre.ethers.getContractFactory("FarmingPoolUpgradeable");
    const farmingPool: FarmingPoolUpgradeable =
      FarmingPool.attach(farmingPoolAddress);

    const poolInfo = await farmingPool.poolList(1);
    console.log("Tx details: ", formatEther(poolInfo.bonusDegisPerSecond));
  }
);

// CLY: 0xec3492a2508DDf4FDc0cD76F31f340b30d1793e6
task("addDoubleRewardToken", "Add double reward to a farming pool")
  .addParam("lptoken", "LPToken address", null, types.string)
  .addParam("rewardtoken", "Reward token address", null, types.string)
  .setAction(async (taskArgs, hre) => {
    const { network, addressList, dev_account } = await hre.run("preparation");

    const doubleRewarderAddress = addressList[network.name].DoubleRewarder;
    const doubleRewarderContract: DoubleRewarder = new DoubleRewarder__factory(
      dev_account
    ).attach(doubleRewarderAddress);

    const rewardTokenAddress = taskArgs.rewardtoken;

    console.log("The reward token address is: ", rewardTokenAddress);

    const tx = await doubleRewarderContract.addRewardTokenWithMock(
      taskArgs.lptoken,
      rewardTokenAddress
    );
    console.log("Tx details: ", await tx.wait());

    const mockAddress = await doubleRewarderContract.getMockRewardToken(
      taskArgs.lptoken,
      rewardTokenAddress
    );
    console.log("The mock address is: ", mockAddress);

    const rewardInfo = await doubleRewarderContract.pools(mockAddress);
    console.log("Reward info: ", rewardInfo);
  });

task("setDoubleRewardSpeed", "Add double reward to a farming pool")
  .addParam("lptoken", "LPToken address", null, types.string)
  .addParam("rewardtoken", "Real reward token address", null, types.string)
  .addParam("reward", "Reward speed", null, types.string)
  .setAction(async (taskArgs, hre) => {
    const { network, addressList, dev_account } = await hre.run("preparation");

    const doubleRewarderAddress = addressList[network.name].DoubleRewarder;
    const doubleRewarderContract: DoubleRewarder = new DoubleRewarder__factory(
      dev_account
    ).attach(doubleRewarderAddress);

    const tx = await doubleRewarderContract.setRewardSpeed(
      taskArgs.lptoken,
      taskArgs.rewardtoken,
      parseUnits(taskArgs.reward)
    );
    console.log("Tx details: ", await tx.wait());
  });

task("setDoubleRewardContract", "Set the double reward contract").setAction(
  async (_, hre) => {
    const { network, addressList, dev_account } = await hre.run("preparation");

    const doubleRewarderAddress = addressList[network.name].DoubleRewarder;

    const farmingPoolAddress = addressList[network.name].FarmingPoolUpgradeable;
    const pool: FarmingPoolUpgradeable = new FarmingPoolUpgradeable__factory(
      dev_account
    ).attach(farmingPoolAddress);

    const tx = await pool.setDoubleRewarderContract(doubleRewarderAddress);
    console.log("Tx details: ", await tx.wait());
  }
);

task("setClaimable", "Set double reward token claimable")
  .addParam("token", "Token address", null, types.string)
  .addParam("realtoken", "Real token address", null, types.string)
  .setAction(async (taskArgs, hre) => {
    const { network, addressList, dev_account } = await hre.run("preparation");

    const doubleRewarderAddress = addressList[network.name].DoubleRewarder;
    const doubleRewarder = new DoubleRewarder__factory(dev_account).attach(
      doubleRewarderAddress
    );

    const erc20Contract: MockERC20 = new MockERC20__factory(dev_account).attach(
      taskArgs.realtoken
    );

    const balance = await erc20Contract.balanceOf(doubleRewarderAddress);

    console.log("Real Reward Token Balance: ", formatEther(balance));

    const tx = await doubleRewarder.setClaimable(
      taskArgs.token,
      taskArgs.realtoken
    );
    console.log("Tx details: ", await tx.wait());
  });
