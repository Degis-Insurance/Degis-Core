import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import {
  readAddressList,
  storeAddressList,
  getLinkAddress,
} from "../scripts/contractAddress";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, get } = deployments;

  network.name = network.name == "hardhat" ? "localhost" : network.name;

  const { deployer } = await getNamedAccounts();

  // Read address list from local file
  const addressList = readAddressList();

  const MockUSD = await get("MockUSD");
  const DegisLottery = await get("DegisLottery");
  const EmergencyPool = await get("EmergencyPool");

  const policyToken = await deploy("FDPolicyToken", {
    contract: "FDPolicyToken",
    from: deployer,
    args: [],
    log: true,
  });
  addressList[network.name].FDPolicyToken = policyToken.address;

  const sig = await deploy("SigManager", {
    contract: "SigManager",
    from: deployer,
    args: [],
    log: true,
  });
  addressList[network.name].SigManager = sig.address;

  const pool = await deploy("InsurancePool", {
    contract: "InsurancePool",
    from: deployer,
    args: [EmergencyPool.address, DegisLottery.address, MockUSD.address],
    log: true,
  });
  addressList[network.name].InsurancePool = pool.address;

  // Store the address list after deployment
  storeAddressList(addressList);
};

func.tags = ["FlightDelay"];
export default func;
