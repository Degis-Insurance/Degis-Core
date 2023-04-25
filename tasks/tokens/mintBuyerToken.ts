import "@nomiclabs/hardhat-ethers";
import { readAddressList } from "../../scripts/contractAddress";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { parseUnits } from "ethers/lib/utils";
import { BuyerToken__factory } from "../../typechain";

// ---------------------------------------------------------------------------------------- //
// *************************************** Types ****************************************** //
// ---------------------------------------------------------------------------------------- //

type MintBuyerTokenTaskArgs = {
  address: string;
  amount: string;
};

// ---------------------------------------------------------------------------------------- //
// ************************************* Task Action ************************************** //
// ---------------------------------------------------------------------------------------- //

export const mintBuyerTokenAction = async (
  taskArgs: MintBuyerTokenTaskArgs,
  hre: HardhatRuntimeEnvironment
) => {
  const { network, ethers } = hre;
  const addressList = readAddressList();

  console.log(
    `\n⏳⏳ Task Start: mint buyertoken ⏳⏳\n`,
    `\n⏳⏳ Network: ${network.name} ⏳⏳\n`
  );

  const [dev] = await ethers.getSigners();

  // Get the token contract instance
  const buyerToken = new BuyerToken__factory(dev).attach(
    addressList[network.name].BuyerToken
  );
  // Add minter
  const tx = await buyerToken.mintBuyerToken(
    taskArgs.address,
    parseUnits(taskArgs.amount)
  );

  console.log(await tx.wait());

  console.log(`\n✅✅ Task Finish: mint buyertoken ✅✅\n`);
};
