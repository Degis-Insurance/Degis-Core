import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction, ProxyOptions } from "hardhat-deploy/types";
import { readAddressList, storeAddressList } from "../scripts/contractAddress";

// Deploy Farming Pool
// It is a proxy deployment
// New:
//    - TransparentUpgradeableProxy
//    - FarmingPoolUpgradeable
// Tasks:
//    - Add degis minter role to FarmingPoolUpgradeable
// Tags:
//    - Farming

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;

  network.name = network.name == "hardhat" ? "localhost" : network.name;

  const { deployer } = await getNamedAccounts();

  // Read address list from local file
  const addressList = readAddressList();

  const degisTokenAddress = addressList[network.name].DegisToken;

  console.log("DegisToken address: ", degisTokenAddress);

  // Always use the same proxy admin
  const proxyOptions: ProxyOptions = {
    proxyContract: "TransparentUpgradeableProxy",
    viaAdminContract: { name: "ProxyAdmin", artifact: "ProxyAdmin" },
    execute: {
      init: {
        methodName: "initialize",
        args: [degisTokenAddress],
      },
    },
  };

  const farmingPoolUpgradeable = await deploy("FarmingPoolUpgradeable", {
    contract: "FarmingPoolUpgradeable",
    from: deployer,
    proxy: proxyOptions,
    args: [],
    log: true,
  });
  addressList[network.name].FarmingPoolUpgradeable =
    farmingPoolUpgradeable.address;

  storeAddressList(addressList);

  await hre.run("addMinterBurner", {
    type: "minter",
    token: "d",
    name: "FarmingPoolUpgradeable",
  });
};

func.tags = ["Farming"];
export default func;
