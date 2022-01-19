import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { parseUnits } from "ethers/lib/utils";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get } = deployments;

  const { deployer } = await getNamedAccounts();

  const DegisToken = await get("DegisToken");

  const factory = await deploy("StakingPoolFactory", {
    contract: "StakingPoolFactory",
    from: deployer,
    args: [DegisToken.address],
    log: true,
  });

  const blockNumber = await ethers.provider.getBlockNumber();

  await deploy("CoreStakingPool", {
    contract: "CoreStakingPool",
    from: deployer,
    args: [
      DegisToken.address,
      DegisToken.address,
      factory.address,
      blockNumber + 4000,
      parseUnits("20"),
      false,
    ],
    log: true,
  });
};

func.tags = ["Staking"];
export default func;
