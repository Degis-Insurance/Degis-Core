import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get } = deployments;

  const { deployer } = await getNamedAccounts();

  const DegisToken = await get("DegisToken");
  const BuyerToken = await get("BuyerToken");

  await deploy("FarmingPool", {
    contract: "FarmingPool",
    from: deployer,
    args: [DegisToken.address],
    log: true,
  });

  await deploy("PurchaseIncentiveVault", {
    contract: "PurchaseIncentiveVault",
    from: deployer,
    args: [BuyerToken.address, DegisToken.address],
    log: true,
  });
};

func.tags = ["Farming"];
export default func;
