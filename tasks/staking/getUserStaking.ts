import "@nomiclabs/hardhat-ethers";
import { readAddressList } from "../../scripts/contractAddress";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import {
  CoreStakingPool__factory,
  StakingPoolFactory,
  StakingPoolFactory__factory,
} from "../../typechain";
import { formatUnits } from "ethers/lib/utils";

// ---------------------------------------------------------------------------------------- //
// *************************************** Types ****************************************** //
// ---------------------------------------------------------------------------------------- //

type TaskArgs = {
  pooltoken: string;
  address: string;
};

// ---------------------------------------------------------------------------------------- //
// ************************************* Task Action ************************************** //
// ---------------------------------------------------------------------------------------- //

export const getUserStakingAction = async (
  taskArgs: TaskArgs,
  hre: HardhatRuntimeEnvironment
) => {
  const { network, ethers } = hre;
  const addressList = readAddressList();
  const [dev] = await ethers.getSigners();

  console.log(
    `\n⏳⏳ Task Start: get user staking info ⏳⏳\n`,
    `\n⏳⏳ Network: ${network.name} ⏳⏳\n`
  );

  const stakingPoolFactoryAddress =
    addressList[network.name].StakingPoolFactory;

  const factory: StakingPoolFactory = new StakingPoolFactory__factory(
    dev
  ).attach(stakingPoolFactoryAddress);

  const poolAddress = await factory.getPoolAddress(taskArgs.pooltoken);
  console.log(`Staking pool address: ${poolAddress}`);

  const pool = new CoreStakingPool__factory(dev).attach(poolAddress);
  const userInfo = await pool.users(taskArgs.address);
  console.log(`User token amount: ${formatUnits(userInfo.tokenAmount)}`);
  console.log(`User total weight: ${formatUnits(userInfo.totalWeight)}`);
  console.log(`User reward debt: ${formatUnits(userInfo.rewardDebt)}`);

  const userDeposits = await pool.getUserDeposits(taskArgs.address);
  console.log(`User deposits amount: ${userDeposits.length}`);

  userDeposits.forEach((deposit, index) => {
    console.log(`\n User deposit info ${index}`);
    console.log(`Token amount: ${formatUnits(deposit.tokenAmount)}`);
    console.log(`Weight: ${formatUnits(deposit.weight)}`);
    console.log(`Locked from: ${deposit.lockedFrom}`);
    console.log(`Locked until: ${deposit.lockedUntil}`);
  });

  console.log("\n✅✅ Task Finish: get user staking info ✅✅\n");
};
