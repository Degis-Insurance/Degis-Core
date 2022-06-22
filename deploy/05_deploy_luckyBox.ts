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

  if (network.name == "avax" || network.name == "avaxTest") {
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
