import { subtask, task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
// import hre from "hardhat";

import {
  readAddressList,
  readFarmingPoolList,
  readNaughtyPoolList,
  readNaughtyTokenList,
  readProxyAdmin,
  readSignerList,
  clearAddressList,
  clearFarmingPoolList,
  clearNaughtyPoolList,
  clearNaughtyTokenList,
  clearProxyAdmin,
  clearSignerList,
  storeAddressList,
  storeFarmingPoolList,
  storeNaughtyPoolList,
  storeNaughtyTokenList,
  storeProxyAdmin,
} from "../scripts/contractAddress";

task("clearRecord", "Clear some record")
  .addParam("type", "Type of info to be cleared", null, types.string)
  .setAction(async (taskArgs, hre) => {
    const { network } = hre;
    switch (taskArgs.type) {
      case "ContractAddress":
        const addressList = readAddressList();
        addressList[network.name] = {};
        storeAddressList(addressList);
        break;
      case "FarmingPool":
        const farmingPoolList = readFarmingPoolList();
        farmingPoolList[network.name] = {};
        storeFarmingPoolList(farmingPoolList);
        break;
      case "NaughtyPool":
        const naughtyPoolList = readFarmingPoolList();
        naughtyPoolList[network.name] = {};
        storeNaughtyPoolList(naughtyPoolList);
        break;
      case "NaughtyToken":
        const naughtyTokenList = readNaughtyTokenList();
        naughtyTokenList[network.name] = {};
        storeNaughtyTokenList(naughtyTokenList);
        break;
      case "ProxyAdmin":
        const proxyAdmin = readProxyAdmin();
        proxyAdmin[network.name] = {};
        storeProxyAdmin(proxyAdmin);
        break;
      case "Signer":
        clearSignerList();
        break;
      default:
        console.log("Unrecognized type");
        break;
    }
  });
