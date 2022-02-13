import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
// import hre from "hardhat";

import { PolicyCore, PolicyCore__factory } from "../../typechain";
import { readAddressList } from "../../scripts/contractAddress";
import { parseUnits } from "ethers/lib/utils";

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

task("settleAllPolicyTokens", "Settle policy tokens for users")
  .addParam("name", "token name", null, types.string)
  .addParam("stablecoin", "Address of the stablecoin", null, types.string)
  .addParam("start", "Start index of the policy token list", null, types.int)
  .addParam("stop", "End index of the policy token list", null, types.int)
  .setAction(async (taskArgs, hre) => {
    const policyTokenName = taskArgs.name;
    const stablecoinAddress = taskArgs.stablecoin;
    const startIndex = taskArgs.start;
    const stopIndex = taskArgs.stop;

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

    const tx = await core.settleAllPolicyTokens(
      policyTokenName,
      stablecoinAddress,
      startIndex,
      stopIndex
    );
    console.log("Tx details: ", await tx.wait());
  });
