import "@nomiclabs/hardhat-ethers";
import { readAddressList } from "../../scripts/contractAddress";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { VoteEscrowedDegis, VoteEscrowedDegis__factory } from "../../typechain";
import { formatUnits } from "ethers/lib/utils";

// ---------------------------------------------------------------------------------------- //
// ************************************* Task Action ************************************** //
// ---------------------------------------------------------------------------------------- //

export const claimVeDEGAction = async (
  _: any,
  hre: HardhatRuntimeEnvironment
) => {
  const { network, ethers } = hre;
  const addressList = readAddressList();
  const [dev] = await ethers.getSigners();

  console.log(
    `\n⏳⏳ Task Start: claim veDEG ⏳⏳\n`,
    `\n⏳⏳ Network: ${network.name} ⏳⏳\n`
  );

  const veAddress = addressList[network.name].VoteEscrowedDegis;

  const veDEG: VoteEscrowedDegis = new VoteEscrowedDegis__factory(dev).attach(
    veAddress
  );

  const tx = await veDEG.claim();
  console.log("tx details: ", await tx.wait());

  const balance = await veDEG.balanceOf(dev.address);
  console.log("User balance after claim: ", formatUnits(balance));

  console.log("\n✅✅ Task Finish: claim veDEG ✅✅\n");
};
