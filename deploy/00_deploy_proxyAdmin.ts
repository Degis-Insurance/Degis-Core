import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction, ProxyOptions } from "hardhat-deploy/types";
import {
  readAddressList,
  storeAddressList,
  readProxyAdmin,
  storeProxyAdmin,
} from "../scripts/contractAddress";

// Deploy Proxy Admin
// It is a non-proxy deployment
// Contract:
//    - ProxyAdmin
// Tags:
//    - ProxyAdmin

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;

  network.name = network.name == "hardhat" ? "localhost" : network.name;

  const { deployer } = await getNamedAccounts();

  // Read address list from local file
  const addressList = readAddressList();
  const proxyAddressList = readProxyAdmin();

  // Proxy Admin contract artifact
  const proxyAdmin = await deploy("ProxyAdmin", {
    contract: "ProxyAdmin",
    from: deployer,
    args: [],
    log: true,
  });
  addressList[network.name].ProxyAdmin = proxyAdmin.address;
  proxyAddressList[network.name] = proxyAdmin.address;

  // Store the address list after deployment
  storeAddressList(addressList);
  storeProxyAdmin(proxyAddressList);
};

func.tags = ["ProxyAdmin"];
export default func;
