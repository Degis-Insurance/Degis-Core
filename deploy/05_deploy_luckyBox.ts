import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { readAddressList, storeAddressList } from "../scripts/contractAddress";

// Deploy Treasury Box
// It is a non-proxy deployment
// Contract:
//    - Random Number Generator
//    - Degis Lottery
// Tags:
//    - Lottery

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, get } = deployments;

  network.name = network.name == "hardhat" ? "localhost" : network.name;

  const { deployer } = await getNamedAccounts();

  // Read address list from local file
  const addressList = readAddressList();

  const DegisToken = await get("DegisToken");
  const MockUSD = await get("MockUSD");

  const keyhash_fuji_300GWEI =
    "0x354d2f95da55398f44b7cff77da56283d9c6c829a4bdf1bbcaf2ad6a4d081f61";
  const subscriptionId_fuji = 130;
  const coordinator_fuji = "0x2eD832Ba664535e5886b75D64C46EB9a228C2610";

  const rand = await deploy("RandomNumberGenerator", {
    contract: "RandomNumberGeneratorV2",
    from: deployer,
    args: [coordinator_fuji, keyhash_fuji_300GWEI, subscriptionId_fuji],
    log: true,
  });
  addressList[network.name].RandomNumberGeneratorV2 = rand.address;

  const lottery = await deploy("DegisLottery", {
    contract: "DegisLotteryV2",
    from: deployer,
    args: [DegisToken.address, MockUSD.address, rand.address],
    log: true,
  });
  addressList[network.name].DegisLottery = lottery.address;

  // Store the address list after deployment
  storeAddressList(addressList);

  // Run some afterwars tasks
  await hre.run("setLottery");
  await hre.run("setRandGenerator");
};

func.tags = ["Lottery"];
export default func;
