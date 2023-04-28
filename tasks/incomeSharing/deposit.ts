import "@nomiclabs/hardhat-ethers";
import { readAddressList } from "../../scripts/contractAddress";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import {
  IncomeSharingVaultV2,
  IncomeSharingVaultV2__factory,
} from "../../typechain";
import { parseUnits } from "ethers/lib/utils";

// ---------------------------------------------------------------------------------------- //
// *************************************** Types ****************************************** //
// ---------------------------------------------------------------------------------------- //

type TaskArgs = {
  id: string;
  amount: string;
};

// ---------------------------------------------------------------------------------------- //
// ************************************* Task Action ************************************** //
// ---------------------------------------------------------------------------------------- //

export const depositIncomeSharingAction = async (
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

  const vault: IncomeSharingVaultV2 = new IncomeSharingVaultV2__factory(
    dev
  ).attach(addressList[network.name].IncomeSharingVault);

  const tx = await vault.deposit(taskArgs.id, parseUnits(taskArgs.amount));
  console.log("tx details: ", await tx.wait());

  console.log("\n✅✅ Task Finish: {task name} ✅✅\n");
};
