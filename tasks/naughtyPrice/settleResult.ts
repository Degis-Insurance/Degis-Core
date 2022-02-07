import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
// import hre from "hardhat";

import { PolicyCore, PolicyCore__factory } from "../../typechain";
import { readAddressList } from "../../scripts/contractAddress";

task("settleNPToken", "Settle a naughty price token")
  .addParam("name", "token name", null, types.string)
  .setAction(async (taskArgs, hre) => {
    const policyTokenName = taskArgs.name;
    console.log("Generated policy toke name: ", policyTokenName);

    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    const policyCoreAddress = addressList[network.name].PolicyCore;
    console.log(
      "The policy core address of this network is: ",
      policyCoreAddress
    );
    const PolicyCore: PolicyCore__factory = await hre.ethers.getContractFactory(
      "PolicyCore"
    );
    const core: PolicyCore = PolicyCore.attach(policyCoreAddress);

    const tx = await core.settleFinalResult(policyTokenName);
    console.log("tx details:", await tx.wait());

    const events = (await tx.wait()).events;
    console.log("events: ", events);
  });
