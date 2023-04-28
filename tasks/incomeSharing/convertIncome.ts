import "@nomiclabs/hardhat-ethers";
import { readAddressList } from "../../scripts/contractAddress";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import {
  getTokenAddressOnAVAX,
  getTokenAddressOnArb,
} from "../../info/tokenAddress";
import { IncomeMaker__factory, MockUSD__factory } from "../../typechain";
import { formatUnits } from "ethers/lib/utils";

// ---------------------------------------------------------------------------------------- //
// *************************************** Types ****************************************** //
// ---------------------------------------------------------------------------------------- //

type TaskArgs = {
  token: string;
};

// ---------------------------------------------------------------------------------------- //
// ************************************* Task Action ************************************** //
// ---------------------------------------------------------------------------------------- //

export const convertIncomeAction = async (
  taskArgs: TaskArgs,
  hre: HardhatRuntimeEnvironment
) => {
  const { network, ethers } = hre;
  const addressList = readAddressList();
  const [dev] = await ethers.getSigners();

  console.log(
    `\n⏳⏳ Task Start: convert income in income maker ⏳⏳\n`,
    `\n⏳⏳ Network: ${network.name} ⏳⏳\n`
  );

  const policyTokenAddress = taskArgs.token;

  // Income maker contract
  const maker = new IncomeMaker__factory(dev).attach(
    addressList[network.name].IncomeMaker
  );

  // Stablecoin address
  let usdAddress: string;
  if (network.name == "avax" || network.name == "avaxTest") {
    usdAddress = getTokenAddressOnAVAX("USDC");
  } else if (network.name == "arb") {
    usdAddress = getTokenAddressOnArb("USDC");
  } else {
    usdAddress = addressList[network.name].MockUSD;
  }

  const usd = new MockUSD__factory(dev).attach(usdAddress);

  const balBefore = await usd.balanceOf(
    addressList[network.name].IncomeSharingVault
  );
  console.log("Income sharing vault bal before: ", formatUnits(balBefore, 6));

  const tx = await maker.convertIncome(policyTokenAddress, usdAddress);
  console.log("Tx details: ", await tx.wait());

  const balAfter = await usd.balanceOf(
    addressList[network.name].IncomeSharingVault
  );
  console.log("Income sharing vault bal after: ", formatUnits(balAfter, 6));

  const diff = balAfter.sub(balBefore);
  console.log("New income: ", formatUnits(diff, 6));

  console.log("\n✅✅ Task Finish: convert income in income maker ✅✅\n");
};
