import { task } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import { readAddressList } from "../../scripts/contractAddress";

import { PolicyFlow, PolicyFlow__factory } from "../../typechain";

task(
  "setPolicyFlow",
  "Set the contract addresses inside policy flow"
).setAction(async (_, hre) => {
  const { network } = hre;

  // Signers
  const [dev_account] = await hre.ethers.getSigners();
  console.log("The default signer is: ", dev_account.address);

  const addressList = readAddressList();

  // Addresses to be set
  const flightOracleAddress = addressList[network.name].FlightOracle;

  // Get naughty factory contract instance
  const policyFlowAddress = addressList[network.name].PolicyFlow;
  const PolicyFlow: PolicyFlow__factory = await hre.ethers.getContractFactory(
    "PolicyFlow"
  );
  const policyFlow: PolicyFlow = PolicyFlow.attach(policyFlowAddress);

  // Set
  const tx = await policyFlow.setFlightOracle(flightOracleAddress);
  console.log("Tx details:", await tx.wait());

  // Check the result
  const oracleAddress = await policyFlow.flightOracle();
  console.log(
    "The policy core address inside naughty factory: ",
    oracleAddress
  );
});
