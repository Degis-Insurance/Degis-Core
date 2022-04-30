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
import { getTokenAddressOnAVAX } from "../../info/tokenAddress";
import { Contract } from "ethers";

task("deployNPToken", "Deploy a new naughty price token")
  .addParam("name", "Strike token asset", null, types.string)
  .addParam("stablecoin", "Stablecoin asset", null, types.string)
  .addParam("k", "Strike price", null, types.string)
  .addParam(
    "namedecimals",
    "Decimals of this policy token name",
    null,
    types.int
  )
  .addParam("iscall", "Whether it is a call token", null, types.int)
  .addParam("round", "Round of this token's insurance", null, types.string)
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

    let stablecoinAddress: string;

    const { network } = hre;

    const addressList = readAddressList();
    const tokenList = readNaughtyTokenList();

    if (network.name == "avax" || network.name == "avaxTest") {
      stablecoinAddress = getTokenAddressOnAVAX(taskArgs.stablecoin);
    } else stablecoinAddress = addressList[network.name].MockUSD;

    console.log("Stablecoin address: ", stablecoinAddress);

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const stablecoinInstance: Contract = new ethers.Contract(
      stablecoinAddress,
      ["function decimals() public view returns (uint8)"],
      dev_account
    );
    const stablecoinDecimals = await stablecoinInstance.decimals();
    console.log("Stablecoin decimals: ", stablecoinDecimals);

    const policyCoreAddress = addressList[network.name].PolicyCoreUpgradeable;
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
      stablecoinAddress,
      boolisCall,
      taskArgs.namedecimals,
      stablecoinDecimals,
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
