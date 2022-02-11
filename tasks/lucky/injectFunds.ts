import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import { readAddressList } from "../../scripts/contractAddress";

import { DegisLottery, DegisLottery__factory } from "../../typechain";
import { parseUnits } from "ethers/lib/utils";

task("injectFunds", "Inject usd into degis lottery")
  .addParam("amount", "Amount of usd to be injected", null, types.string)
  .setAction(async (taskArgs, hre) => {
    // Get the args
    const injectAmount = taskArgs.amount;

    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    // Get naughty factory contract instance
    const lotteryAddress = addressList[network.name].DegisLottery;
    const DegisLottery: DegisLottery__factory =
      await hre.ethers.getContractFactory("DegisLottery");
    const lottery: DegisLottery = DegisLottery.attach(lotteryAddress);

    // Set
    const tx = await lottery.injectFunds(parseUnits(injectAmount));
    console.log("Tx details:", await tx.wait());

    // Check the result
    const balance = await lottery.allPendingRewards();
    console.log("All pending rewards in lottery: ", balance);
  });

task("startLotteryRound", "Start a new lottery round")
  .addParam("end", "End time of the round", null, types.int)
  .setAction(async (taskArgs, hre) => {
    const endTime = taskArgs.end;
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    // Get lottery contract instance
    const lotteryAddress = addressList[network.name].DegisLottery;
    const DegisLottery: DegisLottery__factory =
      await hre.ethers.getContractFactory("DegisLottery");
    const lottery: DegisLottery = DegisLottery.attach(lotteryAddress);

    const tx = await lottery.startLottery(endTime, [2000, 2000, 2000, 2000]);
    console.log("Tx details:", await tx.wait());
  });

task("closeLotteryRound", "Settle the current lottery round").setAction(
  async (_, hre) => {
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    // Get lottery contract instance
    const lotteryAddress = addressList[network.name].DegisLottery;
    const DegisLottery: DegisLottery__factory =
      await hre.ethers.getContractFactory("DegisLottery");
    const lottery: DegisLottery = DegisLottery.attach(lotteryAddress);

    const tx = await lottery.closeLottery();
    console.log("Tx details: ", await tx.wait());
  }
);

task("drawLotteryRound", "Draw the final result of this round").setAction(
  async (_, hre) => {
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    // Get lottery contract instance
    const lotteryAddress = addressList[network.name].DegisLottery;
    const DegisLottery: DegisLottery__factory =
      await hre.ethers.getContractFactory("DegisLottery");
    const lottery: DegisLottery = DegisLottery.attach(lotteryAddress);

    const tx = await lottery.drawLottery();
    console.log("Tx details: ", await tx.wait());
  }
);
