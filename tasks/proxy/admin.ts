import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import { readAddressList } from "../../scripts/contractAddress";

import { ProxyAdmin, ProxyAdmin__factory } from "../../typechain";

task("upgrade", "Upgrade an implementation").setAction(
  async (taskArgs, hre) => {
    const impl = "0x2ab2d422ddcc4415957ab48200660176a13764a1";
    const proxy = "0xaE4b0b9eaAe17acA2cFA4e8eF85558ECFa87dbb5";

    // Network info
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    // Get policy core contract instance
    const proxyAdminAddress = addressList[network.name].ProxyAdmin;
    const ProxyAdmin: ProxyAdmin__factory = await hre.ethers.getContractFactory(
      "ProxyAdmin"
    );
    const admin: ProxyAdmin = ProxyAdmin.attach(proxyAdminAddress);

    // Set
    const tx = await admin.upgrade(proxy, impl);
    console.log("Tx details:", await tx.wait());

    // Check the result
    const newimp = await admin.getProxyImplementation(proxy);
    console.log("The new implementation: ", newimp);
  }
);
