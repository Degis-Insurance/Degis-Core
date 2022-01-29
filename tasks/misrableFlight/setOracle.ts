import { task } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import { readAddressList } from "../../scripts/contractAddress";

import { FlightOracle, FlightOracle__factory } from "../../typechain";

task(
  "setFDOracle",
  "Set the contract addresses inside flight oracle"
).setAction(async (_, hre) => {
  const { network } = hre;

  // Signers
  const [dev_account] = await hre.ethers.getSigners();
  console.log("The default signer is: ", dev_account.address);

  const addressList = readAddressList();

  // Addresses to be set
  const policyFlowAddress = addressList[network.name].PolicyFlow;

  // Get flight oracle contract instance
  const flightOracleAddress = addressList[network.name].FlightOracle;
  const FlightOracle: FlightOracle__factory =
    await hre.ethers.getContractFactory("FlightOracle");
  const oracle: FlightOracle = FlightOracle.attach(flightOracleAddress);

  // Set
  const tx = await oracle.setPolicyFlow(policyFlowAddress);
  console.log("Tx details: ", await tx.wait());

  // Check the result
  const flowAddress = await oracle.policyFlow();
  console.log("The policy flow address inside flight oracle: ", flowAddress);

  const linkToken = await oracle.getChainlinkTokenAddress();
  console.log("Link token address: ", linkToken);
});
