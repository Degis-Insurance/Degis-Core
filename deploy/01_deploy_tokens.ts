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

  // Deploy degis token contract
  // No constructor args
  const degis = await deploy("DegisToken", {
    contract: "DegisToken",
    from: deployer,
    args: [],
    log: true,
  });
  addressList[network.name].DegisToken = degis.address;

  // Deploy buyer token contract
  // No constructor args
  const buyerToken = await deploy("BuyerToken", {
    contract: "BuyerToken",
    from: deployer,
    args: [],
    log: true,
  });
  addressList[network.name].BuyerToken = buyerToken.address;

  if (network.name == "avax" || network.name == "avaxTest") {
    const IERC20ABI = await getArtifact("ERC20").then((x) => x.abi);

    await save("USDCe", {
      address: stablecoin,
      abi: IERC20ABI,
    });

    addressList[network.name].USDCe = stablecoin;
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
