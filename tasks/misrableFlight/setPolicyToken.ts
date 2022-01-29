import { task } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import { readAddressList } from "../../scripts/contractAddress";

import { FDPolicyToken__factory, FDPolicyToken } from "../../typechain";

task(
  "setFDPolicyToken",
  "Set the contract addresses inside flight delay policy token"
).setAction(async (_, hre) => {
  const { network } = hre;

  // Signers
  const [dev_account] = await hre.ethers.getSigners();
  console.log("The default signer is: ", dev_account.address);

  const addressList = readAddressList();

  // Addresses to be set
  const policyFlowAddress = addressList[network.name].PolicyFlow;

  // Get flight oracle contract instance
  const policyTokenAddress = addressList[network.name].FDPolicyToken;
  const FDPolicyToken: FDPolicyToken__factory =
    await hre.ethers.getContractFactory("FDPolicyToken");
  const policyToken: FDPolicyToken = FDPolicyToken.attach(policyTokenAddress);

  // Set
  const tx = await policyToken.updatePolicyFlow(policyFlowAddress);
  console.log("Tx details: ", await tx.wait());

  // Check the result
  const flowAddress = await policyToken.policyFlow();
  console.log("The policy flow address inside fd policy toekn: ", flowAddress);
});
