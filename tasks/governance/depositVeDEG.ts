import "@nomiclabs/hardhat-ethers";
import { readAddressList } from "../../scripts/contractAddress";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import {
  DegisToken,
  DegisToken__factory,
  VoteEscrowedDegis,
  VoteEscrowedDegis__factory,
} from "../../typechain";
import { formatUnits, parseUnits } from "ethers/lib/utils";

// ---------------------------------------------------------------------------------------- //
// *************************************** Types ****************************************** //
// ---------------------------------------------------------------------------------------- //

type TaskArgs = {
  amount: string;
};

// ---------------------------------------------------------------------------------------- //
// ************************************* Task Action ************************************** //
// ---------------------------------------------------------------------------------------- //

export const depositVeDEGAction = async (
  taskArgs: TaskArgs,
  hre: HardhatRuntimeEnvironment
) => {
  const { network, ethers } = hre;
  const addressList = readAddressList();
  const [dev] = await ethers.getSigners();

  console.log(
    `\n⏳⏳ Task Start: deposit veDEG ⏳⏳\n`,
    `\n⏳⏳ Network: ${network.name} ⏳⏳\n`
  );

  const veAddress = addressList[network.name].VoteEscrowedDegis;

  const veDEG: VoteEscrowedDegis = new VoteEscrowedDegis__factory(dev).attach(
    veAddress
  );

  const deg: DegisToken = new DegisToken__factory(dev).attach(
    addressList[network.name].DegisToken
  );

  const allowance = await deg.allowance(dev.address, veAddress);
  console.log("allowance: ", formatUnits(allowance));
  if (formatUnits(allowance) == "0.0") {
    await deg.approve(veAddress, parseUnits("10000000000"));
  }

  const tx = await veDEG.deposit(parseUnits(taskArgs.amount));
  console.log("tx details: ", await tx.wait());

  console.log("\n✅✅ Task Finish: deposit veDEG ✅✅\n");
};
