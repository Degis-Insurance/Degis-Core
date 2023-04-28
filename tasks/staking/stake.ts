import "@nomiclabs/hardhat-ethers";
import { readAddressList } from "../../scripts/contractAddress";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import {
  CoreStakingPool,
  CoreStakingPool__factory,
  DegisToken,
  DegisToken__factory,
  StakingPoolFactory,
  StakingPoolFactory__factory,
} from "../../typechain";
import { parseUnits } from "ethers/lib/utils";

// ---------------------------------------------------------------------------------------- //
// *************************************** Types ****************************************** //
// ---------------------------------------------------------------------------------------- //

type TaskArgs = {
  pooltoken: string;
  amount: string;
  lockuntil: string;
};

// ---------------------------------------------------------------------------------------- //
// ************************************* Task Action ************************************** //
// ---------------------------------------------------------------------------------------- //

export const stakeAction = async (
  taskArgs: TaskArgs,
  hre: HardhatRuntimeEnvironment
) => {
  const { network, ethers } = hre;
  const addressList = readAddressList();
  const [dev] = await ethers.getSigners();

  console.log(
    `\n⏳⏳ Task Start: stake in staking pool ⏳⏳\n`,
    `\n⏳⏳ Network: ${network.name} ⏳⏳\n`
  );

  const stakingPoolFactoryAddress =
    addressList[network.name].StakingPoolFactory;

  const factory: StakingPoolFactory = new StakingPoolFactory__factory(
    dev
  ).attach(stakingPoolFactoryAddress);

  const poolAddress = await factory.getPoolAddress(taskArgs.pooltoken);
  console.log(`Staking pool address: ${poolAddress}`);

  const stakingPool: CoreStakingPool = new CoreStakingPool__factory(dev).attach(
    poolAddress
  );

  const deg: DegisToken = new DegisToken__factory(dev).attach(
    addressList[network.name].DegisToken
  );

  const allowance = await deg.allowance(dev.address, poolAddress);
  if (allowance.lt(parseUnits(taskArgs.amount))) {
    const approveTx = await deg.approve(
      poolAddress,
      parseUnits("1000000000000")
    );
    console.log("approve tx details: ", await approveTx.wait());
  }

  const tx = await stakingPool.stake(
    parseUnits(taskArgs.amount),
    taskArgs.lockuntil
  );
  console.log("tx details: ", await tx.wait());

  console.log("\n✅✅ Task Finish: stake in staking pool ✅✅\n");
};
