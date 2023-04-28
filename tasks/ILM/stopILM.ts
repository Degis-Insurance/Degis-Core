import "@nomiclabs/hardhat-ethers";
import { readAddressList } from "../../scripts/contractAddress";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { readILMList, storeILMList } from "../../scripts/contractAddress";
import { NaughtyPriceILM__factory, PolicyCore__factory } from "../../typechain";

// ---------------------------------------------------------------------------------------- //
// *************************************** Types ****************************************** //
// ---------------------------------------------------------------------------------------- //

type TaskArgs = {
  name: string;
  policytoken: string;
  deadline: string;
};

// ---------------------------------------------------------------------------------------- //
// ************************************* Task Action ************************************** //
// ---------------------------------------------------------------------------------------- //

export const stopILMAction = async (
  taskArgs: TaskArgs,
  hre: HardhatRuntimeEnvironment
) => {
  const { network, ethers } = hre;
  const addressList = readAddressList();
  const [dev] = await ethers.getSigners();

  console.log(
    `\n⏳⏳ Task Start: stop ILM ⏳⏳\n`,
    `\n⏳⏳ Network: ${network.name} ⏳⏳\n`
  );

  const ILMList = readILMList();

  const ILM = new NaughtyPriceILM__factory(dev).attach(
    addressList[network.name].ILM
  );
  const core = new PolicyCore__factory(dev).attach(
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
  if (deadline.toString() != taskArgs.deadline) {
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

  console.log("\n✅✅ Task Finish: stop ILM ✅✅\n");
};
