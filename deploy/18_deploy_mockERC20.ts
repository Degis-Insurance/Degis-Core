import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { readAddressList, storeAddressList } from "../scripts/contractAddress";
import { getTokenAddressOnAVAX } from "../info/tokenAddress";

const stablecoin: string = getTokenAddressOnAVAX("USDC.e");

// Deploy Basic Tokens
// It is a non-proxy deployment
// Contract:
//    - Degis Token
//    - Buyer Token
// Tags:
//    - Tokens

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, save, getArtifact } = deployments;

  network.name = network.name == "hardhat" ? "localhost" : network.name;

  const { deployer } = await getNamedAccounts();

  // Read address list from local file
  const addressList = readAddressList();

  const mockERC20 = await deploy("MockERC20", {
    contract: "MockERC20",
    from: deployer,
    args: [],
    log: true,
  });
  addressList[network.name].MockERC20 = mockERC20.address;

  // Store the address list after deployment
  storeAddressList(addressList);
};

func.tags = ["MockERC20"];
export default func;
