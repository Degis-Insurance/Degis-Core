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

  const keyhash_mainnet =
    "0xAA77729D3466CA35AE8D28B3BBAC7CC36A5031EFDC430821C02BC31A238AF445";

  const rand = await deploy("RandomNumberGenerator", {
    contract: "RandomNumberGenerator",
    from: deployer,
    args: [
      hre.ethers.constants.AddressZero,
      hre.ethers.constants.AddressZero,
      keyhash_mainnet,
    ],
    log: true,
  });
  addressList[network.name].RandomNumberGenerator = rand.address;

  const lottery = await deploy("DegisLottery", {
    contract: "DegisLottery",
    from: deployer,
    args: [DegisToken.address, MockUSD.address, rand.address],
    log: true,
  });
  addressList[network.name].DegisLottery = lottery.address;

  // Store the address list after deployment
  storeAddressList(addressList);

  // Run some afterwars tasks
  await hre.run("setLottery");
  await hre.run("setRandGenerator")
};

func.tags = ["Lottery"];
export default func;
