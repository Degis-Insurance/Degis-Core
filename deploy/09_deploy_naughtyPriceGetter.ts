import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { readAddressList, storeAddressList } from "../scripts/contractAddress";

// Deploy Price Getter for Naughty Price
// It is a non-proxy deployment
// Contract:
//    - PriceGetter
// Tags:
//    - PriceGetter

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;

  network.name = network.name == "hardhat" ? "localhost" : network.name;

  const { deployer } = await getNamedAccounts();

  // Read address list from local file
  const addressList = readAddressList();

  // Price Getter can be used multiple times
  const priceGetter = await deploy("PriceGetter", {
    contract: "PriceGetter",
    from: deployer,
    args: [],
    log: true,
  });
  addressList[network.name].PriceGetter = priceGetter.address;

  // Store the address list after deployment
  storeAddressList(addressList);
};

func.tags = ["PriceGetter"];
export default func;
