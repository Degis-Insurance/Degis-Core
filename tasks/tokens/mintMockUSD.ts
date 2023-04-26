import "@nomiclabs/hardhat-ethers";
import { readAddressList } from "../../scripts/contractAddress";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { parseUnits } from "ethers/lib/utils";
import { MockUSD__factory } from "../../typechain";

// ---------------------------------------------------------------------------------------- //
// *************************************** Types ****************************************** //
// ---------------------------------------------------------------------------------------- //

type MintMockUSDTaskArgs = {
  address: string;
  amount: string;
};

// ---------------------------------------------------------------------------------------- //
// ************************************* Task Action ************************************** //
// ---------------------------------------------------------------------------------------- //

export const mintMockUSDAction = async (
  taskArgs: MintMockUSDTaskArgs,
  hre: HardhatRuntimeEnvironment
) => {
  const { network, ethers } = hre;
  const addressList = readAddressList();

  console.log(
    `\n⏳⏳ Task Start: mint mock usd ⏳⏳\n`,
    `\n⏳⏳ Network: ${network.name} ⏳⏳\n`
  );

  const [dev] = await ethers.getSigners();

  // Get the token contract instance
  const usd = new MockUSD__factory(dev).attach(
    addressList[network.name].MockUSD
  );

  const tx = await usd.mint(taskArgs.address, parseUnits(taskArgs.amount, 6));

  console.log(await tx.wait());

  console.log(`\n✅✅ Task Finish: mint mock usd ✅✅\n`);
};
