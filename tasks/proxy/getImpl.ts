import "@nomiclabs/hardhat-ethers";
import { readAddressList } from "../../scripts/contractAddress";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ProxyAdmin, ProxyAdmin__factory } from "../../typechain";

// ---------------------------------------------------------------------------------------- //
// *************************************** Types ****************************************** //
// ---------------------------------------------------------------------------------------- //

type TaskArgs = {
  proxy: string;
};

// ---------------------------------------------------------------------------------------- //
// ************************************* Task Action ************************************** //
// ---------------------------------------------------------------------------------------- //

export const getImplAction = async (
  taskArgs: TaskArgs,
  hre: HardhatRuntimeEnvironment
) => {
  const { network, ethers } = hre;
  const addressList = readAddressList();
  const [dev] = await ethers.getSigners();

  console.log(
    `\n⏳⏳ Task Start: get impl ⏳⏳\n`,
    `\n⏳⏳ Network: ${network.name} ⏳⏳\n`
  );

  const proxy = taskArgs.proxy;

  // Get policy core contract instance
  const proxyAdminAddress = addressList[network.name].ProxyAdmin;
  const admin: ProxyAdmin = new ProxyAdmin__factory(dev).attach(
    proxyAdminAddress
  );

  // Check the result
  const imp = await admin.getProxyImplementation(proxy);
  console.log("The implementation: ", imp);

  console.log("\n✅✅ Task Finish: get impl ✅✅\n");
};
