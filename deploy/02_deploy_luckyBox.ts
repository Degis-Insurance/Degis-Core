import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get } = deployments;

  const { deployer } = await getNamedAccounts();

  const DegisToken = await get("DegisToken");
  const MockUSD = await get("MockUSD");

  const keyhash_mainnet =
    "0xAA77729D3466CA35AE8D28B3BBAC7CC36A5031EFDC430821C02BC31A238AF445";

  const rand = await deploy("RandomNumberGenerator", {
    contract: "RandomNumberGenerator",
    from: deployer,
    args: [
      hre.ethers.constants.AddressZero,
      hre.ethers.constants.AddressZero,
      keyhash_mainnet,
    ],
    log: true,
  });

  await deploy("DegisLottery", {
    contract: "DegisLottery",
    from: deployer,
    args: [DegisToken.address, MockUSD.address, rand.address],
    log: true,
  });
};

func.tags = ["Lottery"];
export default func;
