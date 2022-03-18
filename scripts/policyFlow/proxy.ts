import { formatEther, parseUnits } from "ethers/lib/utils";
import hre from "hardhat";
import { PolicyFlow, PolicyFlow__factory } from "../../typechain";
import { readAddressList } from "../contractAddress";

async function main() {
  const addressList = readAddressList();

  const { getNamedAccounts, network } = hre;
  console.log(
    "You are testing the proxy policyflow at the ",
    network.name,
    " network"
  );

  const policyFlowAddress = addressList[network.name].PolicyFlow;

  console.log(
    "The farming pool address of this network is: ",
    policyFlowAddress
  );

  // Signers
  const [dev_account] = await hre.ethers.getSigners();
  console.log("The dfault signer is: ", dev_account.address);

  const PolicyFlow: PolicyFlow__factory = await hre.ethers.getContractFactory(
    "PolicyFlow"
  );
  const flow: PolicyFlow = PolicyFlow.attach(policyFlowAddress);

  const fee = await flow.fee();
  console.log("fee is: ", formatEther(fee));
}

main()
  .then(() => {
    process.exitCode = 0;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
