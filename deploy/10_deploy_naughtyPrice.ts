import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { readAddressList, storeAddressList } from "../scripts/contractAddress";
import { getTokenAddressOnAVAX } from "../info/tokenAddress";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, get } = deployments;

  network.name = network.name == "hardhat" ? "localhost" : network.name;

  const { deployer } = await getNamedAccounts();

  // Read address list from local file
  const addressList = readAddressList();

  const BuyerToken = await get("BuyerToken");
  const priceGetter = await get("PriceGetter");

  const factory = await deploy("NaughtyFactory", {
    contract: "NaughtyFactory",
    from: deployer,
    args: [],
    log: true,
  });
  addressList[network.name].NaughtyFactory = factory.address;

  if (network.name == "avax" || network.name == "avaxTest") {
    const usdcAddress = getTokenAddressOnAVAX("USDC.e");
    const core = await deploy("PolicyCore", {
      contract: "PolicyCore",
      from: deployer,
      args: [usdcAddress, factory.address, priceGetter.address],
      log: true,
    });
    addressList[network.name].PolicyCore = core.address;
  } else {
    const MockUSD = await get("MockUSD");
    const core = await deploy("PolicyCore", {
      contract: "PolicyCore",
      from: deployer,
      args: [MockUSD.address, factory.address, priceGetter.address],
      log: true,
    });
    addressList[network.name].PolicyCore = core.address;
  }

  const router = await deploy("NaughtyRouter", {
    contract: "NaughtyRouter",
    from: deployer,
    args: [factory.address, BuyerToken.address],
    log: true,
  });
  addressList[network.name].NaughtyRouter = router.address;

  // Store the address list after deployment
  storeAddressList(addressList);

  // Run some afterwards tasks
  await hre.run("setNPFactory");
  await hre.run("setNPRouter");
  await hre.run("setNPCore");

  // Add minter role to naughty router
  await hre.run("addMinterBurner", ["minter", "b", "NaughtyRouter"]);
};

func.tags = ["NaughtyPrice"];
export default func;
