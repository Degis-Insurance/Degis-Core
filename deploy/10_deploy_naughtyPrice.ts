import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction, ProxyOptions } from "hardhat-deploy/types";
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

  //
  // Factory
  //
  const proxyOptions_factory: ProxyOptions = {
    proxyContract: "TransparentUpgradeableProxy",
    viaAdminContract: { name: "ProxyAdmin", artifact: "ProxyAdmin" },
    execute: {
      init: {
        methodName: "initialize",
        args: [],
      },
    },
  };

  const factoryUpgradeable = await deploy("NaughtyFactoryUpgradeable", {
    contract: "NaughtyFactory",
    from: deployer,
    proxy: proxyOptions_factory,
    args: [],
    log: true,
  });

  addressList[network.name].NaughtyFactoryUpgradeable =
    factoryUpgradeable.address;

  //
  // Core
  //
  if (network.name == "avax" || network.name == "avaxTest") {
    const usdcAddress = getTokenAddressOnAVAX("USDC.e");
    const proxyOptions_core: ProxyOptions = {
      proxyContract: "TransparentUpgradeableProxy",
      viaAdminContract: { name: "ProxyAdmin", artifact: "ProxyAdmin" },
      execute: {
        init: {
          methodName: "initialize",
          args: [usdcAddress, factoryUpgradeable.address, priceGetter.address],
        },
      },
    };

    const coreUpgradeable = await deploy("PolicyCoreUpgradeable", {
      contract: "PolicyCore",
      from: deployer,
      proxy: proxyOptions_core,
      args: [],
      log: true,
    });

    addressList[network.name].PolicyCoreUpgradeable = coreUpgradeable.address;
  } else {
    const MockUSD = await get("MockUSD");
    const proxyOptions_core: ProxyOptions = {
      proxyContract: "TransparentUpgradeableProxy",
      viaAdminContract: { name: "ProxyAdmin", artifact: "ProxyAdmin" },
      execute: {
        init: {
          methodName: "initialize",
          args: [
            MockUSD.address,
            factoryUpgradeable.address,
            priceGetter.address,
          ],
        },
      },
    };

    const coreUpgradeable = await deploy("PolicyCoreUpgradeable", {
      contract: "PolicyCore",
      from: deployer,
      proxy: proxyOptions_core,
      args: [],
      log: true,
    });

    addressList[network.name].PolicyCoreUpgradeable = coreUpgradeable.address;
  }

  //
  // Router
  //
  const proxyOptions_router: ProxyOptions = {
    proxyContract: "TransparentUpgradeableProxy",
    viaAdminContract: { name: "ProxyAdmin", artifact: "ProxyAdmin" },
    execute: {
      init: {
        methodName: "initialize",
        args: [factoryUpgradeable.address, BuyerToken.address],
      },
    },
  };

  const routerUpgradeable = await deploy("NaughtyRouterUpgradeable", {
    contract: "NaughtyRouter",
    from: deployer,
    proxy: proxyOptions_router,
    args: [],
    log: true,
  });

  addressList[network.name].NaughtyRouterUpgradeable =
    routerUpgradeable.address;

  // Store the address list after deployment
  storeAddressList(addressList);

  // Run some afterwards tasks
  await hre.run("setNPFactory");
  await hre.run("setNPRouter");
  await hre.run("setNPCore");

  // // Add minter role to naughty router
  await hre.run("addMinterBurner", {
    type: "minter",
    token: "b",
    name: "NaughtyRouterUpgradeable",
  });
};

func.tags = ["NaughtyPrice"];
export default func;

// const factory = await deploy("NaughtyFactory", {
//   contract: "NaughtyFactory",
//   from: deployer,
//   args: [],
//   log: true,
// });
// addressList[network.name].NaughtyFactory = factory.address;

// if (network.name == "avax" || network.name == "avaxTest") {
//   const usdcAddress = getTokenAddressOnAVAX("USDC.e");
//   const core = await deploy("PolicyCore", {
//     contract: "PolicyCore",
//     from: deployer,
//     args: [usdcAddress, factory.address, priceGetter.address],
//     log: true,
//   });
//   addressList[network.name].PolicyCore = core.address;
// } else {
//   const MockUSD = await get("MockUSD");
//   const core = await deploy("PolicyCore", {
//     contract: "PolicyCore",
//     from: deployer,
//     args: [MockUSD.address, factory.address, priceGetter.address],
//     log: true,
//   });
//   addressList[network.name].PolicyCore = core.address;
// }

// const router = await deploy("NaughtyRouter", {
//   contract: "NaughtyRouter",
//   from: deployer,
//   args: [factory.address, BuyerToken.address],
//   log: true,
// });
// addressList[network.name].NaughtyRouter = router.address;
