import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import { readAddressList } from "../../scripts/contractAddress";
import {
  EmergencyPool,
  EmergencyPool__factory,
  MockUSD,
  MockUSD__factory,
} from "../../typechain";
import { formatEther, formatUnits, parseUnits } from "ethers/lib/utils";

task("depositEmergencyPool", "deposit funds into emergency pool")
  .addParam("address", "token address", null, types.string)
  .addParam("amount", "amount to deposit", null, types.int)
  .setAction(async (taskArgs, hre) => {
    console.log("\n Deposit funds into emergency pool... \n");

    const tokenAddress = taskArgs.address;
    const depositAmount = taskArgs.amount;

    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    const pool = new EmergencyPool__factory(dev_account).attach(
      addressList[network.name].EmergencyPool
    );

    // Use mockusd as the erc20 interface
    const MockUSD: MockUSD__factory = await hre.ethers.getContractFactory(
      "MockUSD"
    );
    const erc20: MockUSD = MockUSD.attach(tokenAddress);

    // Check allowance
    const allowance = await erc20.allowance(dev_account.address, pool.address);
    if (parseInt(formatUnits(allowance, 6)) < 10000000) {
      await erc20.approve(pool.address, parseUnits("100000000000000000000000"));
    }

    // Deposit
    const tx = await pool.deposit(tokenAddress, parseUnits(depositAmount));

    console.log("\n Finish Deposit funds into emergency pool... \n");
  });

task("withdrawEmergencyPool", "withdraw funds from emergency pool")
  .addParam("address", "token address", null, types.string)
  .setAction(async (taskArgs, hre) => {
    console.log("\n Withdraw funds from emergency pool... \n");

    const tokenAddress = taskArgs.address;

    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    const pool = new EmergencyPool__factory(dev_account).attach(
      addressList[network.name].EmergencyPool
    );

    const token = new MockUSD__factory(dev_account).attach(tokenAddress);
    const balance = await token.balanceOf(pool.address);
    console.log("Balance in emergency pool: ", formatUnits(balance, 6));

    // emergency withdraw
    const tx = await pool.emergencyWithdraw(tokenAddress, balance);
    console.log("Tx details: ", await tx.wait());

    console.log("\n Finish Withdraw funds from emergency pool... \n");
  });
