import "@nomiclabs/hardhat-ethers";
import { readAddressList } from "../../scripts/contractAddress";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { readILMList, storeILMList } from "../../scripts/contractAddress";
import { NaughtyPriceILM__factory, PolicyCore__factory } from "../../typechain";
import {
  getTokenAddressOnAVAX,
  getTokenAddressOnArb,
} from "../../info/tokenAddress";

// ---------------------------------------------------------------------------------------- //
// *************************************** Types ****************************************** //
// ---------------------------------------------------------------------------------------- //

type TaskArgs = {
  policytoken: string;
  stablecoin: string;
  deadline: string;
};

// ---------------------------------------------------------------------------------------- //
// ************************************* Task Action ************************************** //
// ---------------------------------------------------------------------------------------- //

export const startILMAction = async (
  taskArgs: TaskArgs,
  hre: HardhatRuntimeEnvironment
) => {
  const { network, ethers } = hre;
  const addressList = readAddressList();
  const [dev] = await ethers.getSigners();

  console.log(
    `\n⏳⏳ Task Start: start ILM ⏳⏳\n`,
    `\n⏳⏳ Network: ${network.name} ⏳⏳\n`
  );

  const ILMList = readILMList();

  const ILM = new NaughtyPriceILM__factory(dev).attach(
    addressList[network.name].ILM
  );
  const core = new PolicyCore__factory(dev).attach(
    addressList[network.name].PolicyCoreUpgradeable
  );

  let stablecoinAddress: string;
  if (network.name == "avax" || network.name == "avaxTest") {
    stablecoinAddress = getTokenAddressOnAVAX(taskArgs.stablecoin);
  } else if (network.name == "arb") {
    stablecoinAddress = getTokenAddressOnArb(taskArgs.stablecoin);
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

  console.log("\n✅✅ Task Finish: start ILM ✅✅\n");
};
