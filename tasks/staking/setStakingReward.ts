import "@nomiclabs/hardhat-ethers";
import { readAddressList } from "../../scripts/contractAddress";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import {
  CoreStakingPool,
  CoreStakingPool__factory,
  StakingPoolFactory,
  StakingPoolFactory__factory,
} from "../../typechain";
import { formatEther, parseUnits } from "ethers/lib/utils";

// ---------------------------------------------------------------------------------------- //
// *************************************** Types ****************************************** //
// ---------------------------------------------------------------------------------------- //

type TaskArgs = {
  pool: string;
  reward: string;
};

// ---------------------------------------------------------------------------------------- //
// ************************************* Task Action ************************************** //
// ---------------------------------------------------------------------------------------- //

export const setStakingRewardAction = async (
  taskArgs: TaskArgs,
  hre: HardhatRuntimeEnvironment
) => {
  const { network, ethers } = hre;
  const addressList = readAddressList();
  const [dev] = await ethers.getSigners();

  console.log(
    `\n⏳⏳ Task Start: set staking reward ⏳⏳\n`,
    `\n⏳⏳ Network: ${network.name} ⏳⏳\n`
  );

  // Get the args
  const poolAddress = taskArgs.pool;
  const degisPerSecond = taskArgs.reward;
  console.log("Pool address to be set: ", poolAddress);
  console.log("New reward speed: ", degisPerSecond, "degis/second");

  const stakingPoolFactoryAddress =
    addressList[network.name].StakingPoolFactory;

  const factory: StakingPoolFactory = new StakingPoolFactory__factory(
    dev
  ).attach(stakingPoolFactoryAddress);

  // Set the start block
  const tx = await factory.setDegisPerSecond(
    poolAddress,
    parseUnits(degisPerSecond)
  );
  console.log("Tx details: ", await tx.wait());

  // Check the result
  const pool: CoreStakingPool = new CoreStakingPool__factory(dev).attach(
    poolAddress
  );
  const degisR = await pool.degisPerSecond();
  console.log("Degis reward after set: ", formatEther(degisR));

  console.log("\n✅✅ Task Finish: set staking reward ✅✅\n");
};
