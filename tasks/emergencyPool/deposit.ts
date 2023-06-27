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
  amount: string;
};

// ---------------------------------------------------------------------------------------- //
// ************************************* Task Action ************************************** //
// ---------------------------------------------------------------------------------------- //

export const depositEmergencyPoolAction = async (
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
  const depositAmount = taskArgs.amount;

  const pool = new EmergencyPool__factory(dev).attach(
    addressList[network.name].EmergencyPool
  );

  const erc20: MockUSD = new MockUSD__factory(dev).attach(tokenAddress);

  // Check allowance
  const allowance = await erc20.allowance(dev.address, pool.address);
  if (parseInt(formatUnits(allowance, 6)) < 10000000) {
    await erc20.approve(pool.address, parseUnits("100000000000000000000000"));
  }

  // Deposit
  const tx = await pool.deposit(tokenAddress, parseUnits(depositAmount));

  console.log("\n✅✅ Task Finish: {task name} ✅✅\n");
};
