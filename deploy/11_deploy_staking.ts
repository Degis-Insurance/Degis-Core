import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { readAddressList, storeAddressList } from "../scripts/contractAddress";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, get } = deployments;

  network.name = network.name == "hardhat" ? "localhost" : network.name;

  const { deployer } = await getNamedAccounts();

  // Read address list from local file
  const addressList = readAddressList();

  const DegisToken = await get("DegisToken");

  const factory = await deploy("StakingPoolFactory", {
    contract: "StakingPoolFactory",
    from: deployer,
    args: [DegisToken.address],
    log: true,
  });
  addressList[network.name].StakingPoolFactory = factory.address;

  // Store the address list after deployment
  storeAddressList(addressList);
};

func.tags = ["Staking"];
export default func;
