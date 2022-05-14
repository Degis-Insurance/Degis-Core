import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction, ProxyOptions } from "hardhat-deploy/types";
import { readAddressList, storeAddressList } from "../scripts/contractAddress";

// Deploy Purchase Incentive Vault
// It is a proxy deployment
//    - TransparentUpgradeableProxy
//    - PurchaseIncentiveVault
// Tasks:
//    - Add degis minter role to PurchaseIncentiveVault
// Tags:
//    - PurchaseIncentive

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, get } = deployments;

  network.name = network.name == "hardhat" ? "localhost" : network.name;

  const { deployer } = await getNamedAccounts();

  // Read address list from local file
  const addressList = readAddressList();

  const DegisToken = await get("DegisToken");
  const BuyerToken = await get("BuyerToken");

  const proxyOptions: ProxyOptions = {
    proxyContract: "TransparentUpgradeableProxy",
    viaAdminContract: { name: "ProxyAdmin", artifact: "ProxyAdmin" },
    execute: {
      init: {
        methodName: "initialize",
        args: [BuyerToken.address, DegisToken.address],
      },
    },
  };

  const purchaseIncentive = await deploy("PurchaseIncentiveVault", {
    contract: "PurchaseIncentiveVault",
    from: deployer,
    proxy: proxyOptions,
    args: [],
    log: true,
  });
  addressList[network.name].PurchaseIncentiveVault = purchaseIncentive.address;

  // Store the address list after deployment
  storeAddressList(addressList);

  // Add degis minter role to purchaseIncentiveVault contract
  if (network.name != "avax") {
    await hre.run("addMinterBurner", {
      type: "minter",
      token: "d",
      name: "PurchaseIncentiveVault",
    });
  }
};

func.tags = ["PurchaseIncentive"];
export default func;
