import "@nomiclabs/hardhat-ethers";
import { readAddressList } from "../../scripts/contractAddress";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { IncomeSharingVaultV2__factory } from "../../typechain";
// ---------------------------------------------------------------------------------------- //
// *************************************** Types ****************************************** //
// ---------------------------------------------------------------------------------------- //

type TaskArgs = {
  token: string;
};

// ---------------------------------------------------------------------------------------- //
// ************************************* Task Action ************************************** //
// ---------------------------------------------------------------------------------------- //

export const startIncomeSharingPoolAction = async (
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

  const vaultAddress = addressList[network.name].IncomeSharingVault;

  const vault = new IncomeSharingVaultV2__factory(dev).attach(vaultAddress);

  // Tx
  const tx = await vault.startPool(taskArgs.token);
  console.log("Tx details: ", await tx.wait());

  // Check the pool result
  const poolId = await vault.nextPool();
  const poolInfo = await vault.pools(poolId.sub(1));
  console.log("Income sharing pool info: ", poolInfo);

  console.log("\n✅✅ Task Finish: start income sharing pool ✅✅\n");
};
