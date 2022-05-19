import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction, ProxyOptions } from "hardhat-deploy/types";
import { readAddressList, storeAddressList } from "../scripts/contractAddress";

// Deploy Farming Pool
// It is a non-proxy(old) or a proxy deployment(new)
// Old:
//    - FarmingPool
// New:
//    - TransparentUpgradeableProxy
//    - FarmingPoolUpgradeable
// Tasks:
//    - Add degis minter role to FarmingPool / FarmingPoolUpgradeable
// Tags:
//    - Farming

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, get } = deployments;

  network.name = network.name == "hardhat" ? "localhost" : network.name;

  const { deployer } = await getNamedAccounts();

  // Read address list from local file
  const addressList = readAddressList();

  const DegisToken = await get("DegisToken");

  console.log("DegisToken address: ", DegisToken.address);

  const isProxy = 1;

  if (!isProxy) {
    const farmingPool = await deploy("FarmingPool", {
      contract: "FarmingPool",
      from: deployer,
      args: [DegisToken.address],
      log: true,
    });
    addressList[network.name].FarmingPool = farmingPool.address;
    // Store the address list after deployment
    storeAddressList(addressList);

    await hre.run("addMinterBurner", ["minter", "d", "FarmingPool"]);
  } else if (isProxy) {
    // const proxyArtifact = await getArtifact("TransparentUpgradeableProxy");
    // Always use the same proxy admin
    const proxyOptions: ProxyOptions = {
      proxyContract: "TransparentUpgradeableProxy",
      viaAdminContract: { name: "ProxyAdmin", artifact: "ProxyAdmin" },
      execute: {
        init: {
          methodName: "initialize",
          args: [DegisToken.address],
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

    // Store the address list after deployment
    storeAddressList(addressList);

    await hre.run("addMinterBurner", {
      type: "minter",
      token: "d",
      name: "FarmingPoolUpgradeable",
    });
  }
};

func.tags = ["Farming"];
export default func;
