import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction, ProxyOptions } from "hardhat-deploy/types";
import {
  readAddressList,
  storeAddressList,
  getLinkAddress,
  readProxyAdmin,
} from "../scripts/contractAddress";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, get } = deployments;

  network.name = network.name == "hardhat" ? "localhost" : network.name;

  const { deployer } = await getNamedAccounts();

  // Read address list from local file
  const addressList = readAddressList();
  const proxyAddressList = readProxyAdmin();

  // Proxy Admin contract artifact
  const proxyAdminFactory = await hre.ethers.getContractFactory("proxyAdmin");
  const proxyAdminAddress = proxyAddressList[network.name].proxyAdmin;
  const proxyAdminArtifact = proxyAdminFactory.attach(proxyAdminAddress);

  const proxyOptions: ProxyOptions = {
    proxyContract: "OpenZeppelinTransparentProxy",
    viaAdminContract: "proxyAdmin",
  };

  // Arguments for deployment
  const insurancePoolAddress = addressList[network.name].InsurancePool;
  const fdPolicyTokenAddress = addressList[network.name].FDPolicyToken;
  const sigManagerAddress = addressList[network.name].SigManager;
  const buyerTokenAddress = addressList[network.name].BuyerToken;
  const argsConfig = [
    insurancePoolAddress,
    fdPolicyTokenAddress,
    sigManagerAddress,
    buyerTokenAddress,
  ];

  const policyFlow = await deploy("PolicyFlow", {
    contract: "PolicyFlow",
    from: deployer,
    proxy: proxyOptions,
    args: argsConfig,
    log: true,
  });
  addressList[network.name].PolicyFlow = policyFlow.address;

  // Store the address list after deployment
  storeAddressList(addressList);
};

func.tags = ["FDPolicyFlow"];
export default func;
