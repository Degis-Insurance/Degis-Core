import { formatEther, parseUnits } from "ethers/lib/utils";
import hre from "hardhat";
import { ProxyAdmin, ProxyAdmin__factory } from "../../typechain";
import { readAddressList } from "../contractAddress";

async function main() {
  const addressList = readAddressList();

  const { getNamedAccounts, network } = hre;
  console.log(
    "You are testing the proxy policyflow at the ",
    network.name,
    " network"
  );

  const proxyAdminAddress = addressList[network.name].ProxyAdmin;

  const policyFlowAddress = addressList[network.name].PolicyFlow;

  console.log(
    "The farming pool address of this network is: ",
    proxyAdminAddress
  );

  // Signers
  const [dev_account] = await hre.ethers.getSigners();
  console.log("The dfault signer is: ", dev_account.address);

  const ProxyAdmin: ProxyAdmin__factory = await hre.ethers.getContractFactory(
    "ProxyAdmin"
  );
  const admin: ProxyAdmin = ProxyAdmin.attach(proxyAdminAddress);

  const implementation = await admin.getProxyImplementation(policyFlowAddress);
  console.log("impl address is: ", implementation);

  const adminContract = await admin.getProxyAdmin(policyFlowAddress);
  console.log("admin of policy flow: ", adminContract);
}

main()
  .then(() => {
    process.exitCode = 0;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
