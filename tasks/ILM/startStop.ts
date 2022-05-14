import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import {
  readAddressList,
  readILMList,
  storeILMList,
} from "../../scripts/contractAddress";
import { getTokenAddressOnAVAX } from "../../info/tokenAddress";

import { NaughtyPriceILM__factory, PolicyCore__factory } from "../../typechain";

task("startILM", "Start a new round ILM")
  .addParam("policytoken", "Policy token address", null, types.string)
  .addParam("deadline", "ILM deadline", null, types.string)
  .setAction(async (taskArgs, hre) => {
    console.log("\n Starting a new round ILM... \n");
    // Network info
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();
    const ILMList = readILMList();

    const ILM = new NaughtyPriceILM__factory(dev_account).attach(
      addressList[network.name].ILM
    );
    const core = new PolicyCore__factory(dev_account).attach(
      addressList[network.name].PolicyCoreUpgradeable
    );

    let stablecoinAddress: string;
    if (network.name == "avax" || network.name == "avaxTest") {
      stablecoinAddress = getTokenAddressOnAVAX(taskArgs.stablecoin);
    } else stablecoinAddress = addressList[network.name].MockUSD;

    console.log("Stablecoin address: ", stablecoinAddress);

    const tx = await ILM.startILM(
      taskArgs.policytoken,
      stablecoinAddress,
      taskArgs.deadline
    );
    console.log("tx details:", await tx.wait());

    const pairInfo = await ILM.pairs(taskArgs.policytoken);
    const lptokenAddress = pairInfo.lptoken;

    const name = await core.findNamebyAddress(taskArgs.policytoken);
    console.log("policy token name: ", name);

    const newILMObject = {
      policyToken: taskArgs.policytoken,
      stablecoin: stablecoinAddress,
      deadline: taskArgs.deadline,
      lptoken: lptokenAddress,
    };
    ILMList[network.name][name] = newILMObject;

    storeILMList(ILMList);

    console.log("\n Finish Starting a new round ILM... \n");
  });

task("stopILM", "Stop a round ILM")
  .addParam("policytoken", "Policy token address", null, types.string)
  .addParam("deadline", "swap deadline", null, types.string)
  .setAction(async (taskArgs, hre) => {
    console.log("\n Stopping a new round ILM... \n");
    // Network info
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();
    const ILMList = readILMList();

    const ILM = new NaughtyPriceILM__factory(dev_account).attach(
      addressList[network.name].ILM
    );
    const core = new PolicyCore__factory(dev_account).attach(
      addressList[network.name].PolicyCoreUpgradeable
    );

    let stablecoinAddress: string;
    if (network.name == "avax" || network.name == "avaxTest") {
      stablecoinAddress = getTokenAddressOnAVAX(taskArgs.stablecoin);
    } else stablecoinAddress = addressList[network.name].MockUSD;

    console.log("Stablecoin address: ", stablecoinAddress);

    const tx = await ILM.finishILM(taskArgs.policytoken, taskArgs.deadline, 50);
    console.log("tx details:", await tx.wait());

    const pairInfo = await ILM.pairs(taskArgs.policytoken);
    const lptokenAddress = pairInfo.lptoken;
    const pairAddress = pairInfo.naughtyPairAddress;

    console.log("naughty pair address: ", pairAddress);

    const name = await core.findNamebyAddress(taskArgs.policytoken);
    console.log("policy token name: ", name);

    let ILMObject =  ILMList[network.name][name]; 
    ILMObject.pairAddress = pairAddress;
    
   
    ILMList[network.name][name] = ILMObject;

    storeILMList(ILMList);

    console.log("\n Finish Stopping a round ILM... \n");
  });

task("approveStablecoin", "Approve stablecoin for ILM")
  .addParam("stablecoin", "Stablecoin address", null, types.string)
  .setAction(async (taskArgs, hre) => {
    console.log("\n Start Approving stablecoin in ILM... \n");
    // Network info
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    const ILM = new NaughtyPriceILM__factory(dev_account).attach(
      addressList[network.name].ILM
    );

    let stablecoinAddress: string;
    if (network.name == "avax" || network.name == "avaxTest") {
      stablecoinAddress = getTokenAddressOnAVAX(taskArgs.stablecoin);
    } else stablecoinAddress = addressList[network.name].MockUSD;

    console.log("Stablecoin address: ", stablecoinAddress);

    const tx = await ILM.approveStablecoin(stablecoinAddress);
    console.log("tx details:", await tx.wait());

    console.log("\n Finish Approving stablecoin in ILM... \n");
  });
