import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
// import hre from "hardhat";

import { SigManager, SigManager__factory } from "../../typechain";
import { readAddressList } from "../../scripts/contractAddress";

task("addSigner", "Add new signer to the sigManager")
  .addParam("address", "The signer's address to be added", null, types.string)
  .setAction(async (taskArgs, hre) => {
    console.log("Signer address to be added: ", taskArgs.address);

    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The dfault signer is: ", dev_account.address);

    const addressList = readAddressList();
    const sigManagerAddress = addressList[network.name].SigManager;

    console.log(
      "The sig manager address of this network is: ",
      sigManagerAddress
    );

    const SigManager: SigManager__factory = await hre.ethers.getContractFactory(
      "SigManager"
    );
    const sigManager: SigManager = SigManager.attach(sigManagerAddress);

    const tx = await sigManager.addSigner(taskArgs.address);
    console.log("Tx details: ",await tx.wait());
  });
