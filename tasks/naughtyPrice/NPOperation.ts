import { subtask, task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import { readAddressList } from "../../scripts/contractAddress";

import { PolicyCore, PolicyCore__factory } from "../../typechain";
import { parseUnits } from "ethers/lib/utils";

const addressList = readAddressList();

task("NPUserAction", "NPUserOperation")
  .addParam("type", "action type", null, types.string)
  .setAction(async (taskArgs, hre) => {
    // Get the args
    const type = taskArgs.type;

    switch (type) {
      case "deposit": {
        await hre.run("NPUserDeposit");
      }
    }
  });

subtask("NPUserDeposit", "User deposit for policy core").setAction(
  async (taskArgs, hre) => {
    // Network info
    const { network } = hre;

    if (network.name != "localhost") return;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const usdAddress = addressList[network.name].MockUSD;

    // Get policy core contract instance
    const policyCoreAddress = addressList[network.name].PolicyCore;
    const PolicyCore: PolicyCore__factory = await hre.ethers.getContractFactory(
      "PolicyCore"
    );
    const core: PolicyCore = PolicyCore.attach(policyCoreAddress);

    const policyTokenName = "AVAX_100.0_L_0322";

    const tx = await core.deposit(
      policyTokenName,
      usdAddress,
      parseUnits("100")
    );

    console.log("tx: ", await tx.wait());
  }
);
