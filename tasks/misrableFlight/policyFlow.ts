import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
// import hre from "hardhat";

import { readAddressList } from "../../scripts/contractAddress";

task("settleFDPolicy", "Settle a flight delay policy").setAction(
  async (_, hre) => {
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    // Load contract instance
    const policyFlowAddress = addressList[network.name].PolicyFlow;

    
  }
);
