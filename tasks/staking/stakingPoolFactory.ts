import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
// import hre from "hardhat";

import {
  CoreStakingPool,
  CoreStakingPool__factory,
  StakingPoolFactory,
  StakingPoolFactory__factory,
} from "../../typechain";
import { readAddressList } from "../../scripts/contractAddress";
import { formatEther, parseUnits } from "ethers/lib/utils";

task("getStakingPool", "Get the staking pool address of a token")
  .addParam("pooltoken", "Address of the pool token", null, types.string)
  .setAction(async (taskArgs, hre) => {
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The dfault signer is: ", dev_account.address);

    const addressList = readAddressList();
    const stakingPoolFactoryAddress =
      addressList[network.name].StakingPoolFactory;

    const factory: StakingPoolFactory = new StakingPoolFactory__factory(
      dev_account
    ).attach(stakingPoolFactoryAddress);

    const poolAddress = await factory.getPoolAddress(taskArgs.pooltoken);
    console.log("Pool address: ", poolAddress);
  });

task("setStakingReward", "Set the degis reward of a staking pool")
  .addParam("pool", "Address of the pool", null, types.string)
  .addParam("reward", "Degis reward per second", null, types.string)
  .setAction(async (taskArgs, hre) => {
    // Get the args
    const poolAddress = taskArgs.pool;
    const degisPerSecond = taskArgs.reward;
    console.log("Pool address to be set: ", poolAddress);
    console.log("New reward speed: ", degisPerSecond, "degis/second");

    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The dfault signer is: ", dev_account.address);

    const addressList = readAddressList();
    const stakingPoolFactoryAddress =
      addressList[network.name].StakingPoolFactory;

    const StakingPoolFactory: StakingPoolFactory__factory =
      await hre.ethers.getContractFactory("StakingPoolFactory");
    const factory: StakingPoolFactory = StakingPoolFactory.attach(
      stakingPoolFactoryAddress
    );

    // Set the start block
    const tx = await factory.setDegisPerSecond(
      poolAddress,
      parseUnits(degisPerSecond)
    );
    console.log("Tx details: ", await tx.wait());

    // Check the result
    const stakingPool: CoreStakingPool__factory =
      await hre.ethers.getContractFactory("CoreStakingPool");
    const pool: CoreStakingPool = stakingPool.attach(poolAddress);
    const degisR = await pool.degisPerSecond();
    console.log("Degis reward after set: ", formatEther(degisR));
  });

// Start timestamp can be set as 0
task("deployStakingPool", "Deploy a new staking pool")
  .addParam("pooltoken", "Address of the pool token", null, types.string)
  .addParam("start", "Staking pool start timestamp", null, types.int)
  .addParam("reward", "Degis reward per second", null, types.string)
  .setAction(async (taskArgs, hre) => {
    // Get the args
    const poolTokenAddress = taskArgs.pooltoken;
    const startTimestamp = taskArgs.start;
    const degisPerSecond = taskArgs.reward;

    // Network info
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    const stakingPoolFactoryAddress =
      addressList[network.name].StakingPoolFactory;

    const StakingPoolFactory: StakingPoolFactory__factory =
      await hre.ethers.getContractFactory("StakingPoolFactory");
    const factory: StakingPoolFactory = StakingPoolFactory.attach(
      stakingPoolFactoryAddress
    );

    // Deploy pool
    const tx = await factory.createPool(
      poolTokenAddress,
      startTimestamp,
      parseUnits(degisPerSecond)
    );
    console.log("Tx details: ", await tx.wait());

    // Check the result
    const poolData = await factory.getPoolData(poolTokenAddress);
    console.log("Pool data just deployed: ", poolData);
  });
