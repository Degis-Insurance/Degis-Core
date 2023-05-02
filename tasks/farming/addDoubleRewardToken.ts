import "@nomiclabs/hardhat-ethers";
import { readAddressList } from "../../scripts/contractAddress";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { DoubleRewarder, DoubleRewarder__factory } from "../../typechain";

// ---------------------------------------------------------------------------------------- //
// *************************************** Types ****************************************** //
// ---------------------------------------------------------------------------------------- //

type TaskArgs = {
  lptoken: string;
  rewardtoken: string;
};

// ---------------------------------------------------------------------------------------- //
// ************************************* Task Action ************************************** //
// ---------------------------------------------------------------------------------------- //

export const addDoubleRewardTokenAction = async (
  taskArgs: TaskArgs,
  hre: HardhatRuntimeEnvironment
) => {
  const { network, ethers } = hre;
  const addressList = readAddressList();
  const [dev] = await ethers.getSigners();

  console.log(
    `\n⏳⏳ Task Start: add double reward token ⏳⏳\n`,
    `\n⏳⏳ Network: ${network.name} ⏳⏳\n`
  );

  const doubleRewarderAddress = addressList[network.name].DoubleRewarder;
  const doubleRewarderContract: DoubleRewarder = new DoubleRewarder__factory(
    dev
  ).attach(doubleRewarderAddress);

  const rewardTokenAddress = taskArgs.rewardtoken;

  console.log("The reward token address is: ", rewardTokenAddress);

  const tx = await doubleRewarderContract.addRewardTokenWithMock(
    taskArgs.lptoken,
    rewardTokenAddress
  );
  console.log("Tx details: ", await tx.wait());

  const mockAddress = await doubleRewarderContract.getMockRewardToken(
    taskArgs.lptoken,
    rewardTokenAddress
  );
  console.log("The mock address is: ", mockAddress);

  const rewardInfo = await doubleRewarderContract.pools(mockAddress);
  console.log("Reward info: ", rewardInfo);

  console.log("\n✅✅ Task Finish: add double reward token ✅✅\n");
};
