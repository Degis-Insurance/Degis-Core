import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import { readAddressList } from "../../scripts/contractAddress";
import { PolicyCore__factory, PolicyCore } from "../../typechain";

task("deployNPPool", "Deploy the swapping pool of naughty price policy token")
  .addParam("name", "Policy token name", null, types.string)
  .addParam("stablecoin", "Address of the stablecoin", null, types.string)
  .addParam("deadline", "Deadline of the swapping pool", null, types.string)
  .addParam("fee", "LP fee rate of the pool", 0, types.int)
  .setAction(async (taskArgs, hre) => {
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The dfault signer is: ", dev_account.address);

    const addressList = readAddressList();

    const policyCoreAddress = addressList[network.name].PolicyCore;
    const PolicyCore: PolicyCore__factory = await hre.ethers.getContractFactory(
      "PolicyCore"
    );
    const policyCore: PolicyCore = PolicyCore.attach(policyCoreAddress);

    const tx = await policyCore.deployPool(
      taskArgs.name,
      taskArgs.stablecoin,
      taskArgs.deadline,
      taskArgs.fee
    );
    console.log(await tx.wait());
  });
