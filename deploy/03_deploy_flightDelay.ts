import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get } = deployments;

  const { deployer } = await getNamedAccounts();

  const MockUSD = await get("MockUSD");
  const DegisLottery = await get("DegisLottery");
  const EmergencyPool = await get("EmergencyPool");
  const BuyerToken = await get("BuyerToken");

  const policyToken = await deploy("FDPolicyToken", {
    contract: "FDPolicyToken",
    from: deployer,
    args: [],
    log: true,
  });

  const sig = await deploy("SigManager", {
    contract: "SigManager",
    from: deployer,
    args: [],
    log: true,
  });

  const pool = await deploy("InsurancePool", {
    contract: "InsurancePool",
    from: deployer,
    args: [EmergencyPool.address, DegisLottery.address, MockUSD.address],
    log: true,
  });

  await deploy("PolicyFlow", {
    contract: "PolicyFlow",
    from: deployer,
    args: [pool.address, policyToken.address, sig.address, BuyerToken.address],
  });
};

func.tags = ["FlightDelay"];
export default func;
