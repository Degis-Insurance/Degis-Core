import "@nomiclabs/hardhat-ethers";
import { readAddressList } from "../../scripts/contractAddress";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ProxyAdmin, ProxyAdmin__factory } from "../../typechain";

// ---------------------------------------------------------------------------------------- //
// *************************************** Types ****************************************** //
// ---------------------------------------------------------------------------------------- //

type TaskArgs = {
  proxy: string;
  impl: string;
};

// ---------------------------------------------------------------------------------------- //
// ************************************* Task Action ************************************** //
// ---------------------------------------------------------------------------------------- //

export const upgradeAction = async (
  taskArgs: TaskArgs,
  hre: HardhatRuntimeEnvironment
) => {
  const { network, ethers } = hre;
  const addressList = readAddressList();
  const [dev] = await ethers.getSigners();

  console.log(
    `\n⏳⏳ Task Start: upgrade ⏳⏳\n`,
    `\n⏳⏳ Network: ${network.name} ⏳⏳\n`
  );

  const impl = taskArgs.impl;
  const proxy = taskArgs.proxy;

  // Get policy core contract instance
  const proxyAdminAddress = addressList[network.name].ProxyAdmin;
  const admin: ProxyAdmin = new ProxyAdmin__factory(dev).attach(
    proxyAdminAddress
  );

  // Set
  const tx = await admin.upgrade(proxy, impl);
  console.log("Tx details:", await tx.wait());

  // Check the result
  const newimp = await admin.getProxyImplementation(proxy);
  console.log("The new implementation: ", newimp);

  console.log("\n✅✅ Task Finish: upgrade ✅✅\n");
};
