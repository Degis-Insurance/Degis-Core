import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
// import hre from "hardhat";

import { PolicyCore, PolicyCore__factory } from "../../typechain";
import { readAddressList } from "../../scripts/contractAddress";
import { formatEther, formatUnits } from "ethers/lib/utils";

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

    const policyCoreAddress = addressList[network.name].PolicyCoreUpgradeable;
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

task("collectIncome", "Collect income from policy core")
  .addParam("stablecoin", "stablecoin address", null, types.string)
  .setAction(async (taskArgs, hre) => {
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

    const balanceBefore = await core.pendingIncomeToLottery(taskArgs.stablecoin);
    console.log("balance: ", formatUnits(balanceBefore, 6));

    const balance2Before = await core.pendingIncomeToSharing(taskArgs.stablecoin);
    console.log("balance: ", formatUnits(balance2Before, 6));

    const tx = await core.collectIncome(taskArgs.stablecoin);
    console.log("tx details:", await tx.wait());

    // old policy core
    // const oldCore = new PolicyCore__factory(dev_account).attach(
    //   addressList[network.name].PolicyCore
    // );

    // const tx = await oldCore.collectIncome(taskArgs.stablecoin);
    // console.log("tx details:", await tx.wait());

    // const balance = await oldCore.pendingIncomeToLottery(taskArgs.stablecoin);
    // console.log("balance: ", formatUnits(balance, 6));

    // const balance2 = await oldCore.pendingIncomeToSharing(taskArgs.stablecoin);
    // console.log("balance: ", formatUnits(balance2, 6));

    const balance = await core.pendingIncomeToLottery(taskArgs.stablecoin);
    console.log("balance: ", formatUnits(balance, 6));

    const balance2 = await core.pendingIncomeToSharing(taskArgs.stablecoin);
    console.log("balance: ", formatUnits(balance2, 6));
  });
