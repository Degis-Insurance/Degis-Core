import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction, ProxyOptions } from "hardhat-deploy/types";
import { readAddressList, storeAddressList } from "../scripts/contractAddress";
import { getTokenAddressOnAVAX } from "../info/tokenAddress";

const stablecoin: string = getTokenAddressOnAVAX("USDC.e");

// Deploy Shield
// Proxy deployment
// Contract:
//    - Shield Swap (previously called Shield)
// Tags:
//    - Shield

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy} = deployments;

  network.name = network.name == "hardhat" ? "localhost" : network.name;

  const { deployer } = await getNamedAccounts();

  // Read address list from local file
  const addressList = readAddressList();

  const proxyOptions: ProxyOptions = {
    proxyContract: "TransparentUpgradeableProxy",
    viaAdminContract: { name: "ProxyAdmin", artifact: "ProxyAdmin" },
    execute: {
      init: {
        methodName: "initialize",
        args: [],
      },
    },
  };

  const shieldSwap = await deploy("Shield", {
    contract: "Shield",
    from: deployer,
    proxy: proxyOptions,
    args: [],
    log: true,
  });

  addressList[network.name].Shield = shieldSwap.address;

  // Store the address list after deployment
  storeAddressList(addressList);
};

func.tags = ["Shield"];
export default func;
