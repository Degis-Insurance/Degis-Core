import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import { readAddressList } from "../../scripts/contractAddress";

import { PolicyCore, PolicyCore__factory } from "../../typechain";

task("addStablecoin", "Set the contract addresses inside naughty factory")
  .addParam("address", "Stablecoin address", null, types.string)
  .setAction(async (taskArgs, hre) => {
    // Get the args
    const stablecoinAddress = taskArgs.address;
    console.log("Stablecoin address to be added: ", stablecoinAddress);

    // Network info
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    // Get policy core contract instance
    const policyCoreAddress = addressList[network.name].PolicyCore;
    const PolicyCore: PolicyCore__factory = await hre.ethers.getContractFactory(
      "PolicyCore"
    );
    const core: PolicyCore = PolicyCore.attach(policyCoreAddress);

    // Set
    const tx = await core.addStablecoin(stablecoinAddress);
    console.log("Tx details:", await tx.wait());

    // Check the result
    const isSupported = await core.supportedStablecoin(stablecoinAddress);
    console.log("The new stable coin supported status: ", isSupported);
  });
