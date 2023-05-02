import "@nomiclabs/hardhat-ethers";
import { readAddressList } from "../../scripts/contractAddress";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import {
  FarmingPoolUpgradeable,
  FarmingPoolUpgradeable__factory,
} from "../../typechain";

// ---------------------------------------------------------------------------------------- //
// *************************************** Types ****************************************** //
// ---------------------------------------------------------------------------------------- //

type TaskArgs = {
  start: string;
};

// ---------------------------------------------------------------------------------------- //
// ************************************* Task Action ************************************** //
// ---------------------------------------------------------------------------------------- //

export const setFarmingStartTimeAction = async (
  taskArgs: TaskArgs,
  hre: HardhatRuntimeEnvironment
) => {
  const { network, ethers } = hre;
  const addressList = readAddressList();
  const [dev] = await ethers.getSigners();

  console.log(
    `\n⏳⏳ Task Start: set farming start timestamp ⏳⏳\n`,
    `\n⏳⏳ Network: ${network.name} ⏳⏳\n`
  );

  const startTimestamp = taskArgs.start;

  const farmingPoolAddress = addressList[network.name].FarmingPoolUpgradeable;
  console.log(
    "The farming pool address of this network is: ",
    farmingPoolAddress
  );

  const farmingPool: FarmingPoolUpgradeable =
    new FarmingPoolUpgradeable__factory(dev).attach(farmingPoolAddress);

  // Set the start block
  const tx = await farmingPool.setStartTimestamp(startTimestamp);
  console.log("Tx details: ", await tx.wait());

  // Check the result
  const startBlockResult = await farmingPool.startTimestamp();
  console.log("Start block for farming: ", startBlockResult.toNumber());

  console.log("\n✅✅ Task Finish: set farming start timestamp ✅✅\n");
};
