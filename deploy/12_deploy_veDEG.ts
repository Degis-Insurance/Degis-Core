import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction, ProxyOptions } from "hardhat-deploy/types";
import { readAddressList, storeAddressList } from "../scripts/contractAddress";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;

  network.name = network.name == "hardhat" ? "localhost" : network.name;

  const { deployer } = await getNamedAccounts();

  // Read address list from local file
  const addressList = readAddressList();

  // Arguments for deployment
  const degisAddress: string = addressList[network.name].DegisToken;
  const farmingPoolAddress: string =
    addressList[network.name].FarmingPoolUpgradeable;

  const argsConfig = [degisAddress, farmingPoolAddress];

  // Always use the same proxy admin
  const proxyOptions: ProxyOptions = {
    proxyContract: "TransparentUpgradeableProxy",
    viaAdminContract: { name: "ProxyAdmin", artifact: "ProxyAdmin" },
    execute: {
      init: {
        methodName: "initialize",
        args: argsConfig,
      },
    },
  };

  const veDEG = await deploy("VeDEG", {
    contract: "VoteEscrowedDegis",
    from: deployer,
    proxy: proxyOptions,
    args: [],
    log: true,
  });
  addressList[network.name].VoteEscrowedDegis = veDEG.address;

  // Store the address list after deployment
  storeAddressList(addressList);
};

func.tags = ["VeDEG"];
export default func;
