import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import { readAddressList } from "../../scripts/contractAddress";

import { ProxyAdmin, ProxyAdmin__factory } from "../../typechain";

task("upgrade", "Upgrade an implementation").setAction(
  async (taskArgs, hre) => {
    const impl = "0x952a5CD023ff12F17d1613deF6308a15289E922d";
    const proxy = "0x71220F9CFe73Fd02A4adff524BeaE689dDa78f4A";

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

task("getImpl", "Get an implementation").setAction(async (taskArgs, hre) => {
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

  // Check the result
  const newimp = await admin.getProxyImplementation(proxy);
  console.log("The implementation: ", newimp);
});

task("Pause", "Pause a contract")
  .addParam("contract", "The contract name", null, types.string)
  .setAction(async (taskArgs, hre) => {
    const contractToPause = taskArgs.contract;
    // Network info
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    const contractAddress = addressList[network.name][contractToPause];
    const contractFactory = await hre.ethers.getContractFactory(
      contractToPause
    );
    const contract = contractFactory.attach(contractAddress);

    const tx = await contract.pause();
    console.log("Tx details: ", await tx.wait());
  });

task("UnPause", "UnPause a contract")
  .addParam("contract", "The contract name", null, types.string)
  .setAction(async (taskArgs, hre) => {
    const contractToPause = taskArgs.contract;
    // Network info
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    const contractAddress = addressList[network.name][contractToPause];
    const contractFactory = await hre.ethers.getContractFactory(
      contractToPause
    );
    const contract = contractFactory.attach(contractAddress);

    const tx = await contract.unpause();
    console.log("Tx details: ", await tx.wait());
  });
