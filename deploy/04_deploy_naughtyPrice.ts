import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { readAddressList, storeAddressList } from "../scripts/contractAddress";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, get } = deployments;

  const { deployer } = await getNamedAccounts();

  // Read address list from local file
  const addressList = readAddressList();

  const BuyerToken = await get("BuyerToken");
  const MockUSD = await get("MockUSD");

  const factory = await deploy("NaughtyFactory", {
    contract: "NaughtyFactory",
    from: deployer,
    args: [],
    log: true,
  });
  addressList[network.name].NaughtyFactory = factory.address;

  const priceGetter = await deploy("PriceGetter", {
    contract: "PriceGetter",
    from: deployer,
    args: [],
    log: true,
  });
  addressList[network.name].PriceGetter = priceGetter.address;

  const core = await deploy("PolicyCore", {
    contract: "PolicyCore",
    from: deployer,
    args: [MockUSD.address, factory.address, priceGetter.address],
    log: true,
  });
  addressList[network.name].PolicyCore = core.address;

  const router = await deploy("NaughtyRouter", {
    contract: "NaughtyRouter",
    from: deployer,
    args: [factory.address, BuyerToken.address],
    log: true,
  });
  addressList[network.name].NaughtyRouter = router.address;

  // Store the address list after deployment
  storeAddressList(addressList);
};

func.tags = ["NaughtyPrice"];
export default func;
