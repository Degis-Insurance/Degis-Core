import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction, ProxyOptions } from "hardhat-deploy/types";
import { readAddressList, storeAddressList } from "../scripts/contractAddress";

// Deploy Price Getter for Naughty Price IDO Protection
// It is a proxy deployment
// Contract:
//    - IDOPriceGetter
// Tags:
//    - IDOPriceGetter

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, get } = deployments;

  network.name = network.name == "hardhat" ? "localhost" : network.name;

  const { deployer } = await getNamedAccounts();

  // Read address list from local file
  const addressList = readAddressList();

  const PolicyCore = await get("PolicyCoreUpgradeable");

  const proxyOptions: ProxyOptions = {
    proxyContract: "TransparentUpgradeableProxy",
    viaAdminContract: { name: "ProxyAdmin", artifact: "ProxyAdmin" },
    execute: {
      init: {
        methodName: "initialize",
        args: [PolicyCore.address],
      },
    },
  };

  // Price Getter can be used multiple times
  const arbitraryPriceGetter = await deploy("ArbitraryPriceGetter", {
    contract: "ArbitraryPriceGetter",
    from: deployer,
    proxy: proxyOptions,
    args: [],
    log: true,
  });
  addressList[network.name].ArbitraryPriceGetter = arbitraryPriceGetter.address;

  // Store the address list after deployment
  storeAddressList(addressList);

  // await hre.run("setIDOPriceGetter");
};

func.tags = ["ArbitraryPriceGetter"];
export default func;
