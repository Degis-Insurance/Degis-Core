import "@nomiclabs/hardhat-ethers";
import { readAddressList } from "../../scripts/contractAddress";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import {
  StakingPoolFactory,
  StakingPoolFactory__factory,
} from "../../typechain";

// ---------------------------------------------------------------------------------------- //
// *************************************** Types ****************************************** //
// ---------------------------------------------------------------------------------------- //

type TaskArgs = {
  pooltoken: string;
};

// ---------------------------------------------------------------------------------------- //
// ************************************* Task Action ************************************** //
// ---------------------------------------------------------------------------------------- //

export const getStakingPoolAction = async (
  taskArgs: TaskArgs,
  hre: HardhatRuntimeEnvironment
) => {
  const { network, ethers } = hre;
  const addressList = readAddressList();
  const [dev] = await ethers.getSigners();

  console.log(
    `\n⏳⏳ Task Start: get staking pool ⏳⏳\n`,
    `\n⏳⏳ Network: ${network.name} ⏳⏳\n`
  );

  const stakingPoolFactoryAddress =
    addressList[network.name].StakingPoolFactory;

  const factory: StakingPoolFactory = new StakingPoolFactory__factory(
    dev
  ).attach(stakingPoolFactoryAddress);

  const poolAddress = await factory.getPoolAddress(taskArgs.pooltoken);
  console.log(`Staking pool address: ${poolAddress}`);

  console.log("\n✅✅ Task Finish: get staking pool ✅✅\n");
};
