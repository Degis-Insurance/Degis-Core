import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
// import hre from "hardhat";

import { PolicyCore, PolicyCore__factory } from "../../typechain";
import {
  readAddressList,
  readNaughtyTokenList,
  storeNaughtyTokenList,
} from "../../scripts/contractAddress";
import { parseUnits } from "ethers/lib/utils";
import { toBN } from "../../test/utils";

task("deployNPToken", "Deploy a new naughty price token")
  .addParam("name", "Strike token asset", null, types.string)
  .addParam("k", "Strike price", null, types.string)
  .addParam("decimals", "Decimals of this policy token", null, types.int)
  .addParam("iscall", "Whether it is a call token", null, types.int)
  .addParam("round", "Round of this token's insurance", null, types.int)
  .addParam("deadline", "Deadline of this token's swapping", null, types.int)
  .addParam(
    "settletime",
    "Settletimestamp of this policy token",
    null,
    types.int
  )
  .setAction(async (taskArgs, hre) => {
    const nameisCall = taskArgs.iscall == 1 ? "H" : "L";
    const boolisCall: boolean = taskArgs.iscall == 1 ? true : false;
    const tokenDeadline = taskArgs.deadline;
    const tokenSettleTime = taskArgs.settletime;
    const policyTokenName =
      taskArgs.name +
      "_" +
      taskArgs.k +
      "_" +
      nameisCall +
      "_" +
      taskArgs.round;
    console.log("Generated policy toke name: ", policyTokenName);

    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();
    const tokenList = readNaughtyTokenList();

    const policyCoreAddress = addressList[network.name].PolicyCore;
    console.log(
      "The policy core address of this network is: ",
      policyCoreAddress
    );
    const PolicyCore: PolicyCore__factory = await hre.ethers.getContractFactory(
      "PolicyCore"
    );
    const core: PolicyCore = PolicyCore.attach(policyCoreAddress);

    const tx = await core.deployPolicyToken(
      taskArgs.name,
      boolisCall,
      taskArgs.decimals,
      parseUnits(taskArgs.k),
      taskArgs.round,
      toBN(tokenDeadline),
      toBN(tokenSettleTime)
    );
    console.log("tx details:", await tx.wait());

    // Check the result
    const policyTokenAddress = await core.findAddressbyName(policyTokenName);
    console.log("Deployed policy token address: ", policyTokenAddress);

    const policyTokenInfo = await core.policyTokenInfoMapping(policyTokenName);
    console.log("Deployed policy token info: ", policyTokenInfo);

    // Store the token info
    const tokenObject = {
      address: policyTokenAddress,
      deadline: tokenDeadline,
      settleTime: tokenSettleTime,
    };
    tokenList[network.name][policyTokenName] = tokenObject;
    storeNaughtyTokenList(tokenList);
  });
