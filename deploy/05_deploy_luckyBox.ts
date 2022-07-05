import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction, ProxyOptions } from "hardhat-deploy/types";
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

  if (
    network.name == "avax" ||
    network.name == "avaxTest" ||
    network.name == "fuji"
  ) {
    // const coordinator = "0x2eD832Ba664535e5886b75D64C46EB9a228C2610";
    // const keyHash =
    //   "0x354d2f95da55398f44b7cff77da56283d9c6c829a4bdf1bbcaf2ad6a4d081f61";
    // const id = 130;
    // const rand = await deploy("RandomNumberGeneratorV2", {
    //   contract: "RandomNumberGeneratorV2",
    //   from: deployer,
    //   args: [coordinator, keyHash, id],
    //   log: true,
    // });
    // addressList[network.name].RandomNumberGeneratorV2 = rand.address;

    const proxyOptions: ProxyOptions = {
      proxyContract: "TransparentUpgradeableProxy",
      viaAdminContract: { name: "ProxyAdmin", artifact: "ProxyAdmin" },
      execute: {
        init: {
          methodName: "initialize",
          args: [DegisToken.address, 0],
        },
      },
    };

    const lottery = await deploy("DegisLotteryV2", {
      contract: "DegisLotteryV2",
      from: deployer,
      proxy: proxyOptions,
      args: [],
      log: true,
    });
    addressList[network.name].DegisLotteryV2 = lottery.address;

    // Store the address list after deployment
    storeAddressList(addressList);

    // await hre.run("setVRF");
  } else {
    const rand = await deploy("VRFMock", {
      contract: "VRFMock",
      from: deployer,
      args: [],
      log: true,
    });
    addressList[network.name].VRFMock = rand.address;

    const proxyOptions: ProxyOptions = {
      proxyContract: "TransparentUpgradeableProxy",
      viaAdminContract: { name: "ProxyAdmin", artifact: "ProxyAdmin" },
      execute: {
        init: {
          methodName: "initialize",
          args: [DegisToken.address, rand.address],
        },
      },
    };

    const lottery = await deploy("DegisLotteryV2", {
      contract: "DegisLotteryV2",
      from: deployer,
      proxy: proxyOptions,
      args: [],
      log: true,
    });
    addressList[network.name].DegisLotteryV2 = lottery.address;

    // Store the address list after deployment
    storeAddressList(addressList);

    await hre.run("setVRFMock");
  }

  // Run some afterwars tasks
  // await hre.run("setLottery");
  await hre.run("setTreasury");
};

func.tags = ["Lottery"];
export default func;
