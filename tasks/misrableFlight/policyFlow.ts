import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
// import hre from "hardhat";

import { PolicyFlow__factory, PolicyFlow } from "../../typechain";

import { readAddressList } from "../../scripts/contractAddress";

task("settleFDPolicy", "Settle a flight delay policy")
  .addParam("id", "policyId", null, types.int)
  .addParam("flight", "flightnumber", null, types.string)
  .addParam("timestamp", "departuretimestamp", null, types.int)
  .addParam("path", "path to get the return result", null, types.string)
  .addParam("update", "whether to force update", false, types.boolean)
  .setAction(async (taskArgs, hre) => {
    // Get the args
    const policyId = taskArgs.id;
    const flightNumber = taskArgs.flight;
    const departureTimestamp = taskArgs.timestamp;
    const path = taskArgs.path;
    const forceUpdate = taskArgs.update;

    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    // Load contract instance
    const policyFlowAddress = addressList[network.name].PolicyFlow;
    const PolicyFlow: PolicyFlow__factory = await hre.ethers.getContractFactory(
      "PolicyFlow"
    );
    const flow: PolicyFlow = PolicyFlow.attach(policyFlowAddress);

    const info = await flow.getPolicyInfoById(policyId);
    console.log(info.departureTimestamp.toNumber());
    console.log(info.buyerAddress);

    const tx = await flow.newClaimRequest(
      policyId,
      flightNumber,
      departureTimestamp,
      path,
      forceUpdate
    );
    console.log("Tx details: ", await tx.wait());
  });
