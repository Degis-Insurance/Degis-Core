import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { readAddressList, storeAddressList } from "../scripts/contractAddress";
import { getTokenAddressOnAVAX } from "../info/tokenAddress";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, save, getArtifact } = deployments;

  network.name = network.name == "hardhat" ? "localhost" : network.name;

  const { deployer } = await getNamedAccounts();

  // Read address list from local file
  const addressList = readAddressList();

  const compensate = await deploy("IncomeCompensate", {
    contract: "IncomeCompensate",
    from: deployer,
    args: [],
    log: true,
  });
  addressList[network.name].IncomeCompensate = compensate.address;

  // Store the address list after deployment
  storeAddressList(addressList);
};

func.tags = ["Compensate"];
export default func;
