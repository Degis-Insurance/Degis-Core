import {  task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import {
  DoubleRewarder,
  DoubleRewarder__factory,
  FarmingPoolUpgradeable,
  FarmingPoolUpgradeable__factory,
  MockERC20,
  MockERC20__factory,
} from "../../typechain";
import { parseUnits, formatEther } from "ethers/lib/utils";
import { stablecoinToWei, toWei } from "../../test/utils";


task("setVeDEG", "Set the VeDEG of a farming pool").setAction(
  async (_, hre) => {
    const { network, addressList, dev_account } = await hre.run("preparation");

    const farmingPoolAddress = addressList[network.name].FarmingPoolUpgradeable;
    console.log(
      "The farming pool address of this network is: ",
      farmingPoolAddress
    );

    const veDEGAddress = addressList[network.name].VoteEscrowedDegis;

    const farmingPool: FarmingPoolUpgradeable =
      new FarmingPoolUpgradeable__factory(dev_account).attach(
        farmingPoolAddress
      );

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



// CLY: 0xec3492a2508DDf4FDc0cD76F31f340b30d1793e6

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
