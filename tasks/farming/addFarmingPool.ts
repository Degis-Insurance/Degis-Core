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
  name: string;
  address: string;
  reward: string;
  bonus: string;
  doublereward: string;
};

// ---------------------------------------------------------------------------------------- //
// ************************************* Task Action ************************************** //
// ---------------------------------------------------------------------------------------- //

export const addFarmingPoolAction = async (
  taskArgs: TaskArgs,
  hre: HardhatRuntimeEnvironment
) => {
  const { network, ethers } = hre;
  const addressList = readAddressList();
  const [dev] = await ethers.getSigners();

  const farmingPoolList = readFarmingPoolList();

  console.log(
    `\n⏳⏳ Task Start: add farming pool ⏳⏳\n`,
    `\n⏳⏳ Network: ${network.name} ⏳⏳\n`
  );

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

  const farmingPoolAddress = addressList[network.name].FarmingPoolUpgradeable;

  const farmingPool: FarmingPoolUpgradeable =
    new FarmingPoolUpgradeable__factory(dev).attach(farmingPoolAddress);

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

  console.log("\n✅✅ Task Finish: add farming pool ✅✅\n");
};
