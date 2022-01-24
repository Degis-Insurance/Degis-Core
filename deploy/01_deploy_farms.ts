import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { readAddressList, storeAddressList } from "../scripts/contractAddress";


const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, get } = deployments;

  const { deployer } = await getNamedAccounts();

  // Read address list from local file
  const addressList = readAddressList();

  const DegisToken = await get("DegisToken");
  const BuyerToken = await get("BuyerToken");

  const farmingPool = await deploy("FarmingPool", {
    contract: "FarmingPool",
    from: deployer,
    args: [DegisToken.address],
    log: true,
  });
  addressList[network.name].FarmingPool = farmingPool.address;

  const purchaseIncentive = await deploy("PurchaseIncentiveVault", {
    contract: "PurchaseIncentiveVault",
    from: deployer,
    args: [BuyerToken.address, DegisToken.address],
    log: true,
  });
  addressList[network.name].PurchaseIncentiveVault = purchaseIncentive.address;

  // Store the address list after deployment
  storeAddressList(addressList);
};

func.tags = ["Farming"];
export default func;
