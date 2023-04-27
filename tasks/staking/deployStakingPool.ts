import "@nomiclabs/hardhat-ethers";
import { readAddressList } from "../../scripts/contractAddress";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import {
  StakingPoolFactory,
  StakingPoolFactory__factory,
} from "../../typechain";
import { parseUnits } from "ethers/lib/utils";

// ---------------------------------------------------------------------------------------- //
// *************************************** Types ****************************************** //
// ---------------------------------------------------------------------------------------- //

type TaskArgs = {
  pooltoken: string;
  start: string;
  reward: string;
};

// ---------------------------------------------------------------------------------------- //
// ************************************* Task Action ************************************** //
// ---------------------------------------------------------------------------------------- //

export const deployStakingPoolAction = async (
  taskArgs: TaskArgs,
  hre: HardhatRuntimeEnvironment
) => {
  const { network, ethers } = hre;
  const addressList = readAddressList();
  const [dev] = await ethers.getSigners();

  console.log(
    `\n⏳⏳ Task Start: {task name} ⏳⏳\n`,
    `\n⏳⏳ Network: ${network.name} ⏳⏳\n`
  );

  // Get the args
  const poolTokenAddress = taskArgs.pooltoken;
  const startTimestamp = taskArgs.start;
  const degisPerSecond = taskArgs.reward;

  const stakingPoolFactoryAddress =
    addressList[network.name].StakingPoolFactory;

  const factory: StakingPoolFactory = new StakingPoolFactory__factory(
    dev
  ).attach(stakingPoolFactoryAddress);

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

  console.log("\n✅✅ Task Finish: {task name} ✅✅\n");
};
