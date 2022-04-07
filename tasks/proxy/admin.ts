import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import { readAddressList } from "../../scripts/contractAddress";

import { ProxyAdmin, ProxyAdmin__factory } from "../../typechain";

task("upgrade", "Upgrade an implementation").setAction(
  async (taskArgs, hre) => {
    const impl = "0x7014094Ed44E3C13bBe781c7456EdF7bC91F0eD2";
    const proxy = "0x218D79aF2C0DD91068dce153c4967257197d6A41";

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
