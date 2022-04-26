import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction, ProxyOptions } from "hardhat-deploy/types";
import { readAddressList, storeAddressList } from "../scripts/contractAddress";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, get } = deployments;

  network.name = network.name == "hardhat" ? "localhost" : network.name;

  const { deployer } = await getNamedAccounts();

  // Read address list from local file
  const addressList = readAddressList();

  const router = await get("NaughtyRouter");
  const factory = await get("NaughtyFactory");
  const vault = await get("IncomeSharingVault");

  // const proxyArtifact = await getArtifact("TransparentUpgradeableProxy");
  // Always use the same proxy admin
  const proxyOptions: ProxyOptions = {
    proxyContract: "TransparentUpgradeableProxy",
    viaAdminContract: { name: "ProxyAdmin", artifact: "ProxyAdmin" },
    execute: {
      methodName: "initialize",
      args: [router.address, factory.address, vault.address],
    },
  };
  const incomeMaker = await deploy("IncomeMaker", {
    contract: "IncomeMaker",
    from: deployer,
    proxy: proxyOptions,
    args: [],
    log: true,
  });

  addressList[network.name].IncomeMaker = incomeMaker.address;

  // Store the address list after deployment
  storeAddressList(addressList);

  // Run some afterwards tasks
  await hre.run("setIncomeMakerInFactory");
};

func.tags = ["NaughtyPrice"];
export default func;
