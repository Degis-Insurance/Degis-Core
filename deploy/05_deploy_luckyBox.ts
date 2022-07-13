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
  // const MockUSD = await get("MockUSD");

  if (
    network.name == "avax" ||
    network.name == "avaxTest" ||
    network.name == "fuji"
  ) {
    const coordinator = "0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634";
    const keyHash =
      "0x89630569c9567e43c4fe7b1633258df9f2531b62f2352fa721cf3162ee4ecb46";
    // const id = 28;
    const id = 30;
    const rand = await deploy("RandomNumberGeneratorV2", {
      contract: "RandomNumberGeneratorV2",
      from: deployer,
      args: [coordinator, keyHash, id],
      log: true,
    });
    addressList[network.name].RandomNumberGeneratorV2 = rand.address;

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
  await hre.run("setVRF");
};

func.tags = ["Lottery"];
export default func;
