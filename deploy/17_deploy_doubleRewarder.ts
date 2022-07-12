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

  const farmingPool = await get("FarmingPoolUpgradeable");

  console.log("farming pool address:", farmingPool.address);

  // const proxyArtifact = await getArtifact("TransparentUpgradeableProxy");
  // Always use the same proxy admin
  const proxyOptions: ProxyOptions = {
    proxyContract: "TransparentUpgradeableProxy",
    viaAdminContract: { name: "ProxyAdmin", artifact: "ProxyAdmin" },
    execute: {
      init: {
        methodName: "initialize",
        args: [farmingPool.address],
      },
    },
  };

  const doubleRewarder = await deploy("DoubleRewarder", {
    contract: "DoubleRewarder",
    from: deployer,
    proxy: proxyOptions,
    args: [],
    log: true,
  });
  addressList[network.name].DoubleRewarder = doubleRewarder.address;

  // Store the address list after deployment
  storeAddressList(addressList);
};

func.tags = ["DoubleReward"];
export default func;
