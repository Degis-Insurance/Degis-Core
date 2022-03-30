import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { readAddressList, storeAddressList } from "../scripts/contractAddress";
import { getTokenAddressOnAVAX } from "../info/tokenAddress";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;

  network.name = network.name == "hardhat" ? "localhost" : network.name;

  const { deployer } = await getNamedAccounts();

  // Read address list from local file
  const addressList = readAddressList();

  // Deploy emergency pool contract
  // No constructor args
  const emergency = await deploy("EmergencyPool", {
    contract: "EmergencyPool",
    from: deployer,
    args: [],
    log: true,
  });
  addressList[network.name].EmergencyPool = emergency.address;

  // Store the address list after deployment
  storeAddressList(addressList);
};

func.tags = ["EmergencyPool"];
export default func;
