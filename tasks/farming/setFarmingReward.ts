import "@nomiclabs/hardhat-ethers";
import {
  readAddressList,
  readFarmingPoolList,
  storeFarmingPoolList,
} from "../../scripts/contractAddress";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import {
  FarmingPoolUpgradeable,
  FarmingPoolUpgradeable__factory,
} from "../../typechain";
import { formatEther, parseUnits } from "ethers/lib/utils";

// ---------------------------------------------------------------------------------------- //
// *************************************** Types ****************************************** //
// ---------------------------------------------------------------------------------------- //

type TaskArgs = {
  id: string;
  reward: string;
  bonus: string;
};

// ---------------------------------------------------------------------------------------- //
// ************************************* Task Action ************************************** //
// ---------------------------------------------------------------------------------------- //

export const setFarmingRewardAction = async (
  taskArgs: TaskArgs,
  hre: HardhatRuntimeEnvironment
) => {
  const { network, ethers } = hre;
  const addressList = readAddressList();
  const [dev] = await ethers.getSigners();

  const farmingPoolList = readFarmingPoolList();

  console.log(
    `\n⏳⏳ Task Start: set farming pool reward ⏳⏳\n`,
    `\n⏳⏳ Network: ${network.name} ⏳⏳\n`
  );

  const poolId = taskArgs.id;
  const basicDegisPerSecond = taskArgs.reward;
  const bonusDegisPerSecond = taskArgs.bonus;

  console.log("Pool id to be set: ", poolId);
  console.log(
    "New reward speed: ",
    Number(basicDegisPerSecond) * 86400,
    "degis/day"
  );
  console.log(
    "New Bonus speed: ",
    Number(bonusDegisPerSecond) * 86400,
    "degis/day"
  );

  const farmingPoolAddress = addressList[network.name].FarmingPoolUpgradeable;
  console.log(
    "The farming pool address of ",
    network.name,
    " is: ",
    farmingPoolAddress
  );

  const farmingPool: FarmingPoolUpgradeable =
    new FarmingPoolUpgradeable__factory(dev).attach(farmingPoolAddress);

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

  console.log("\n✅✅ Task Finish: set farming pool reward ✅✅\n");
};
