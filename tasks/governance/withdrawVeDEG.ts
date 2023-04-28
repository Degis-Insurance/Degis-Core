import "@nomiclabs/hardhat-ethers";
import { readAddressList } from "../../scripts/contractAddress";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { VoteEscrowedDegis, VoteEscrowedDegis__factory } from "../../typechain";
import { parseUnits } from "ethers/lib/utils";

// ---------------------------------------------------------------------------------------- //
// *************************************** Types ****************************************** //
// ---------------------------------------------------------------------------------------- //

type TaskArgs = {
  amount: string;
};

// ---------------------------------------------------------------------------------------- //
// ************************************* Task Action ************************************** //
// ---------------------------------------------------------------------------------------- //

export const withdrawVeDEGAction = async (
  taskArgs: TaskArgs,
  hre: HardhatRuntimeEnvironment
) => {
  const { network, ethers } = hre;
  const addressList = readAddressList();
  const [dev] = await ethers.getSigners();

  console.log(
    `\n⏳⏳ Task Start: withdraw veDEG ⏳⏳\n`,
    `\n⏳⏳ Network: ${network.name} ⏳⏳\n`
  );

  const veAddress = addressList[network.name].VoteEscrowedDegis;

  const veDEG: VoteEscrowedDegis = new VoteEscrowedDegis__factory(dev).attach(
    veAddress
  );

  const tx = await veDEG.withdraw(parseUnits(taskArgs.amount));
  console.log("tx details: ", await tx.wait());

  console.log("\n✅✅ Task Finish: withdraw veDEG ✅✅\n");
};
