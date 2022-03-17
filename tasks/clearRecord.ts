import { subtask, task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
// import hre from "hardhat";

import {
  clearAddressList,
  clearFarmingPoolList,
  clearNaughtyPoolList,
  clearNaughtyTokenList,
  clearProxyAdmin,
  clearSignerList,
} from "../scripts/contractAddress";

task("clearRecord", "Clear some record")
  .addParam("type", "Type of info to be cleared", null, types.string)
  .setAction(async (taskArgs, hre) => {
    switch (taskArgs.type) {
      case "ContractAddress":
        clearAddressList();
      case "FarmingPool":
        clearFarmingPoolList();
      case "NaughtyPool":
        clearNaughtyPoolList();
      case "NaughtyToken":
        clearNaughtyTokenList();
      case "ProxyAdmin":
        clearProxyAdmin();
      case "Signer":
        clearSignerList();
      default:
        console.log("Unrecognized type");
    }
  });
