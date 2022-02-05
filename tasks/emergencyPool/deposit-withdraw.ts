import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import { readAddressList } from "../../scripts/contractAddress";
import {
  EmergencyPool,
  EmergencyPool__factory,
  MockUSD,
  MockUSD__factory,
} from "../../typechain";
import { formatEther, parseUnits } from "ethers/lib/utils";

task("depositEmergencyPool", "deposit funds into emergency pool")
  .addParam("address", "token address", null, types.string)
  .addParam("amount", "amount to deposit", null, types.int)
  .setAction(async (taskArgs, hre) => {
    const tokenAddress = taskArgs.address;
    const depositAmount = taskArgs.amount;

    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The dfault signer is: ", dev_account.address);

    const addressList = readAddressList();

    const emergencyPoolAddress = addressList[network.name].EmergencyPool;
    const EmergencyPool: EmergencyPool__factory =
      await hre.ethers.getContractFactory("EmergencyPool");
    const emergencyPool: EmergencyPool =
      EmergencyPool.attach(emergencyPoolAddress);

    // Use mockusd as the erc20 interface
    const MockUSD: MockUSD__factory = await hre.ethers.getContractFactory(
      "MockUSD"
    );
    const erc20: MockUSD = MockUSD.attach(tokenAddress);

    // Check allowance
    const allowance = await erc20.allowance(
      dev_account.address,
      emergencyPoolAddress
    );
    if (parseInt(formatEther(allowance)) < 10000000) {
      await erc20.approve(
        emergencyPoolAddress,
        parseUnits("100000000000000000000000")
      );
    }

    // Deposit
    const tx = await emergencyPool.deposit(
      tokenAddress,
      parseUnits(depositAmount)
    );
  });

task("withdrawEmergencyPool", "withdraw funds from emergency pool")
  .addParam("address", "token address", null, types.string)
  .addParam("amount", "amount to withdraw", null, types.int)
  .setAction(async (taskArgs, hre) => {
    const tokenAddress = taskArgs.address;
    const depositAmount = taskArgs.amount;

    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The dfault signer is: ", dev_account.address);

    const addressList = readAddressList();

    const emergencyPoolAddress = addressList[network.name].EmergencyPool;
    const EmergencyPool: EmergencyPool__factory =
      await hre.ethers.getContractFactory("EmergencyPool");
    const emergencyPool: EmergencyPool =
      EmergencyPool.attach(emergencyPoolAddress);

    // emergency withdraw
    const tx = await emergencyPool.emergencyWithdraw(
      tokenAddress,
      parseUnits(depositAmount)
    );
    console.log("Tx details: ", await tx.wait());
  });
