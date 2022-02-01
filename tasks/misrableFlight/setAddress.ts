import { task } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import { readAddressList } from "../../scripts/contractAddress";

import {
  PolicyFlow,
  PolicyFlow__factory,
  FDPolicyToken,
  FDPolicyToken__factory,
  FlightOracle,
  FlightOracle__factory,
  InsurancePool,
  InsurancePool__factory,
} from "../../typechain";

task(
  "setFDPolicyFlow",
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

task(
  "setFDInsurancePool",
  "Set the contract addresses inside insurance pool"
).setAction(async (_, hre) => {
  const { network } = hre;

  // Signers
  const [dev_account] = await hre.ethers.getSigners();
  console.log("The default signer is: ", dev_account.address);

  const addressList = readAddressList();

  // Addresses to be set
  const policyFlowAddress = addressList[network.name].PolicyFlow;

  // Get insurance pool contract instance
  const insurancePoolAddress = addressList[network.name].InsurancePool;
  const InsurancePool: InsurancePool__factory =
    await hre.ethers.getContractFactory("InsurancePool");
  const pool: InsurancePool = InsurancePool.attach(insurancePoolAddress);

  // Set
  const tx = await pool.setPolicyFlow(policyFlowAddress);
  console.log("Tx details: ", await tx.wait());

  // Check the result
  const flowAddress = await pool.policyFlow();
  console.log("The policy flow address inside insurance pool: ", flowAddress);
});
