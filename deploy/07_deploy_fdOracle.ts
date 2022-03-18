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

  // Arguments for deployment
  const policyFlowAddress = addressList[network.name].PolicyFlow;
  const linkAddress = getLinkAddress(network.name);
  const argsConfig = [policyFlowAddress, linkAddress];

  const oracle = await deploy("FlightOracle", {
    contract: "FlightOracle",
    from: deployer,
    args: argsConfig,
    log: true,
  });
  addressList[network.name].FlightOracle = oracle.address;

  // Store the address list after deployment
  storeAddressList(addressList);

  // Run some afterwards tasks
  await hre.run("setFDPolicyFlow");
  await hre.run("setFDPolicyToken");
  await hre.run("setFDOracle");
  await hre.run("setFDInsurancePool");
};

func.tags = ["FDOracle"];
export default func;
