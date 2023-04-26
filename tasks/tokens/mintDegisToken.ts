import "@nomiclabs/hardhat-ethers";
import { readAddressList } from "../../scripts/contractAddress";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { parseUnits } from "ethers/lib/utils";
import { DegisToken__factory } from "../../typechain";

// ---------------------------------------------------------------------------------------- //
// *************************************** Types ****************************************** //
// ---------------------------------------------------------------------------------------- //

type MintDegisTokenTaskArgs = {
  address: string;
  amount: string;
};

// ---------------------------------------------------------------------------------------- //
// ************************************* Task Action ************************************** //
// ---------------------------------------------------------------------------------------- //

export const mintDegisTokenAction = async (
  taskArgs: MintDegisTokenTaskArgs,
  hre: HardhatRuntimeEnvironment
) => {
  const { network, ethers } = hre;
  const addressList = readAddressList();

  console.log(
    `\n⏳⏳ Task Start: mint degis token ⏳⏳\n`,
    `\n⏳⏳ Network: ${network.name} ⏳⏳\n`
  );

  const [dev] = await ethers.getSigners();

  // Get the token contract instance
  const degisToken = new DegisToken__factory(dev).attach(
    addressList[network.name].DegisToken
  );

  const tx = await degisToken.mintDegis(
    taskArgs.address,
    parseUnits(taskArgs.amount)
  );

  console.log(await tx.wait());

  console.log(`\n✅✅ Task Finish: mint degis token ✅✅\n`);
};
