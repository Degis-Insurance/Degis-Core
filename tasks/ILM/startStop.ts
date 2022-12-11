import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import {
  readAddressList,
  readILMList,
  storeILMList,
} from "../../scripts/contractAddress";
import { getTokenAddressOnAVAX } from "../../info/tokenAddress";

import {
  NaughtyPriceILM__factory,
  PolicyCore,
  PolicyCore__factory,
} from "../../typechain";
import { formatEther, formatUnits } from "ethers/lib/utils";
import { BigNumber, BigNumberish } from "ethers";
import { stablecoinToWei } from "../../test/utils";

task("startILM", "Start a new round ILM")
  .addParam("policytoken", "Policy token address", null, types.string)
  .addParam("stablecoin", "Stablecoin address", null, types.string)
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
      if (taskArgs.stablecoin == "Shield") {
        stablecoinAddress = addressList[network.name].Shield;
      } else {
        stablecoinAddress = getTokenAddressOnAVAX(taskArgs.stablecoin);
      }
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
  .addParam("name", "Policy token name", null, types.string)
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

    // Double check address
    const policyTokenAddress = await core.findAddressbyName(taskArgs.name);
    if (policyTokenAddress != taskArgs.policytoken) {
      console.log("Wrong address with toke name");
      return;
    }

    // Double check deadline
    const deadline = (await core.policyTokenInfoMapping(taskArgs.name))
      .deadline;
    if (deadline != taskArgs.deadline) {
      console.log("Wrong deadline");
      return;
    }

    const tx = await ILM.finishILM(taskArgs.policytoken, taskArgs.deadline, 50);
    console.log("tx details:", await tx.wait());

    const pairInfo = await ILM.pairs(taskArgs.policytoken);

    const pairAddress = pairInfo.naughtyPairAddress;
    console.log("Newly deployed naughty pair address: ", pairAddress);

    const name = await core.findNamebyAddress(taskArgs.policytoken);
    console.log("Policy token name: ", name);

    let ILMObject = ILMList[network.name][name];
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
      if (taskArgs.stablecoin == "Shield") {
        stablecoinAddress = addressList[network.name].Shield;
      } else {
        stablecoinAddress = getTokenAddressOnAVAX(taskArgs.stablecoin);
      }
    } else stablecoinAddress = addressList[network.name].MockUSD;

    console.log("Stablecoin address: ", stablecoinAddress);

    const tx = await ILM.approveStablecoin(stablecoinAddress);
    console.log("tx details:", await tx.wait());

    console.log("\n Finish Approving stablecoin in ILM... \n");
  });
