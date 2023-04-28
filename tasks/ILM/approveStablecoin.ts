import "@nomiclabs/hardhat-ethers";
import { readAddressList } from "../../scripts/contractAddress";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { NaughtyPriceILM__factory } from "../../typechain";
import {
  getTokenAddressOnAVAX,
  getTokenAddressOnArb,
} from "../../info/tokenAddress";

// ---------------------------------------------------------------------------------------- //
// *************************************** Types ****************************************** //
// ---------------------------------------------------------------------------------------- //

type TaskArgs = {
  stablecoin: string;
};

// ---------------------------------------------------------------------------------------- //
// ************************************* Task Action ************************************** //
// ---------------------------------------------------------------------------------------- //

export const approveStablecoinAction = async (
  taskArgs: TaskArgs,
  hre: HardhatRuntimeEnvironment
) => {
  const { network, ethers } = hre;
  const addressList = readAddressList();
  const [dev] = await ethers.getSigners();

  console.log(
    `\n⏳⏳ Task Start: approve stablecoin ⏳⏳\n`,
    `\n⏳⏳ Network: ${network.name} ⏳⏳\n`
  );

  const ILM = new NaughtyPriceILM__factory(dev).attach(
    addressList[network.name].ILM
  );

  let stablecoinAddress: string;
  if (network.name == "avax" || network.name == "avaxTest") {
    stablecoinAddress = getTokenAddressOnAVAX(taskArgs.stablecoin);
  } else if (network.name == "arb") {
    stablecoinAddress = getTokenAddressOnArb(taskArgs.stablecoin);
  } else stablecoinAddress = addressList[network.name].MockUSD;

  console.log("Stablecoin address: ", stablecoinAddress);

  const tx = await ILM.approveStablecoin(stablecoinAddress);
  console.log("tx details:", await tx.wait());

  console.log("\n✅✅ Task Finish: approve stablecoin ✅✅\n");
};
