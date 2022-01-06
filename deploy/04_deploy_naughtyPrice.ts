import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get } = deployments;

  const { deployer } = await getNamedAccounts();

  const BuyerToken = await get("BuyerToken");
  const MockUSD = await get("MockUSD");

  const factory = await deploy("NaughtyFactory", {
    contract: "NaughtyFactory",
    from: deployer,
    args: [],
    log: true,
  });

  const priceGetter = await deploy("PriceGetter", {
    contract: "PriceGetter",
    from: deployer,
    args: [],
    log: true,
  });

  await deploy("PolicyCore", {
    contract: "PolicyCore",
    from: deployer,
    args: [MockUSD.address, factory.address, priceGetter.address],
    log: true,
  });

  await deploy("NaughtyRouter", {
    contract: "NaughtyRouter",
    from: deployer,
    args: [factory.address, BuyerToken.address],
    log: true,
  });
};

func.tags = ["NaughtyPrice"];
export default func;
