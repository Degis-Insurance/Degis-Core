import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { readAddressList, storeAddressList } from "../scripts/contractAddress";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;

  network.name = network.name == "hardhat" ? "localhost" : network.name;

  const { deployer } = await getNamedAccounts();

  const addressList = readAddressList();

  const degAddress = addressList[network.name].DegisToken;

  const proxyOFT = await deploy("ProxyOFT", {
    contract: "ProxyOFT",
    from: deployer,
    args: [degAddress],
    log: true,
  });
  addressList[network.name].ProxyOFT = proxyOFT.address;

  storeAddressList(addressList);
};

func.tags = ["OFT"];
export default func;
