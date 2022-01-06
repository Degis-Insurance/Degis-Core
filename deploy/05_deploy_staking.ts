import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  await deploy("FixedStaking", {
    contract: "FixedStaking",
    from: deployer,
    args: [],
    log: true,
  });

  await deploy("FlexibleStaking", {
    contract: "FlexibleStaking",
    from: deployer,
    args: [],
    log: true,
  });
};

func.tags = ["Staking"];
export default func;
