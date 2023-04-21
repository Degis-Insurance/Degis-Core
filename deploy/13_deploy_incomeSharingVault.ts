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

  const veDEG = await get("VeDEG");

  // const proxyArtifact = await getArtifact("TransparentUpgradeableProxy");
  // Always use the same proxy admin
  const proxyOptions: ProxyOptions = {
    proxyContract: "TransparentUpgradeableProxy",
    viaAdminContract: { name: "ProxyAdmin", artifact: "ProxyAdmin" },
    execute: {
      init: {
        methodName: "initialize",
        args: [veDEG.address],
      },
    },
  };
  const incomeSharingVault = await deploy("IncomeSharingVault", {
    contract: "IncomeSharingVaultV2",
    from: deployer,
    proxy: proxyOptions,
    args: [],
    log: true,
  });

  addressList[network.name].IncomeSharingVault = incomeSharingVault.address;

  // Store the address list after deployment
  storeAddressList(addressList);

  // Run some afterwards tasks
  await hre.run("setIncomeSharingInCore");
  await hre.run("addIncomeSharingWL");
  await hre.run("setLotteryAndIncomeInCore");

  // await hre.run("updateLastRewardBalance");
};

func.tags = ["IncomeSharing"];
export default func;
