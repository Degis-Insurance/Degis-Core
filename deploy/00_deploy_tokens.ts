import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { readAddressList, storeAddressList } from "../scripts/contractAddress";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, save, getArtifact } = deployments;

  const { deployer } = await getNamedAccounts();

  // Read address list from local file
  const addressList = readAddressList();

  const degis = await deploy("DegisToken", {
    contract: "DegisToken",
    from: deployer,
    args: [],
    log: true,
  });
  addressList[network.name].DegisToken = degis.address;

  const buyerToken = await deploy("BuyerToken", {
    contract: "BuyerToken",
    from: deployer,
    args: [],
    log: true,
  });
  addressList[network.name].BuyerToken = buyerToken.address;

  const emergency = await deploy("EmergencyPool", {
    contract: "EmergencyPool",
    from: deployer,
    args: [],
    log: true,
  });
  addressList[network.name].EmergencyPool = emergency.address;

  if (network.name == "avax") {
    const IERC20ABI = await getArtifact("ERC20").then((x) => x.abi);
    await save("USDC", {
      address: "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
      abi: IERC20ABI,
    });
    addressList[network.name].MockUSD =
      "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664";
  } else {
    const mockUSD = await deploy("MockUSD", {
      contract: "MockUSD",
      from: deployer,
      args: [],
      log: true,
    });
    addressList[network.name].MockUSD = mockUSD.address;
  }

  // Store the address list after deployment
  storeAddressList(addressList);
};

func.tags = ["Tokens"];
export default func;
