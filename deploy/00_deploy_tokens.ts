import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, save, getArtifact } = deployments;

  const { deployer } = await getNamedAccounts();

  await deploy("DegisToken", {
    contract: "DegisToken",
    from: deployer,
    args: [],
    log: true,
  });

  await deploy("BuyerToken", {
    contract: "BuyerToken",
    from: deployer,
    args: [],
    log: true,
  });

  await deploy("EmergencyPool", {
    contract: "EmergencyPool",
    from: deployer,
    args: [],
    log: true,
  });

  if (network.name == "mainnet") {
    const IERC20ABI = await getArtifact("ERC20").then((x) => x.abi);
    await save("USDC", {
      address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      abi: IERC20ABI,
    });
  } else {
    await deploy("MockUSD", {
      contract: "MockUSD",
      from: deployer,
      args: [],
      log: true,
    });
  }
};

func.tags = ["Tokens"];
export default func;
