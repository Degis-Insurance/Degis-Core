import "@nomiclabs/hardhat-ethers";
import { readAddressList } from "../../scripts/contractAddress";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import {
  EmergencyPool__factory,
  MockUSD,
  MockUSD__factory,
} from "../../typechain";
import { formatUnits, parseUnits } from "ethers/lib/utils";

// ---------------------------------------------------------------------------------------- //
// *************************************** Types ****************************************** //
// ---------------------------------------------------------------------------------------- //

type TaskArgs = {
  address: string;
};

// ---------------------------------------------------------------------------------------- //
// ************************************* Task Action ************************************** //
// ---------------------------------------------------------------------------------------- //

export const withdrawEmergencyPoolAction = async (
  taskArgs: TaskArgs,
  hre: HardhatRuntimeEnvironment
) => {
  const { network, ethers } = hre;
  const addressList = readAddressList();
  const [dev] = await ethers.getSigners();

  console.log(
    `\n⏳⏳ Task Start: {task name} ⏳⏳\n`,
    `\n⏳⏳ Network: ${network.name} ⏳⏳\n`
  );

  const tokenAddress = taskArgs.address;

  const pool = new EmergencyPool__factory(dev).attach(
    addressList[network.name].EmergencyPool
  );

  const token = new MockUSD__factory(dev).attach(tokenAddress);
  const balance = await token.balanceOf(pool.address);
  console.log("Balance in emergency pool: ", formatUnits(balance, 6));

  // emergency withdraw
  const tx = await pool.emergencyWithdraw(tokenAddress, balance);
  console.log("Tx details: ", await tx.wait());

  console.log("\n✅✅ Task Finish: {task name} ✅✅\n");
};
