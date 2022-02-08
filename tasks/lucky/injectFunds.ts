import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import { readAddressList } from "../../scripts/contractAddress";

import {
  DegisLottery,
  DegisLottery__factory,
  MockUSD,
  MockUSD__factory,
} from "../../typechain";
import { parseUnits } from "ethers/lib/utils";

task("injectFunds", "Inject usd into degis lottery")
  .addParam("amount", "Amount of usd to be injected", null, types.int)
  .setAction(async (taskArgs, hre) => {
    // Get the args
    const injectAmount = taskArgs.amount;

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

    const mockusdAddress = addressList[network.name].MockUSD;
    const MockUSD: MockUSD__factory = await hre.ethers.getContractFactory(
      "MockUSD"
    );
    const usd: MockUSD = MockUSD.attach(mockusdAddress);

    const tx_1 = await usd.approve(lotteryAddress, parseUnits("500000"));
    console.log("Tx1 details: ", await tx_1.wait());

    // Set
    const tx_2 = await lottery.injectFunds(parseUnits(injectAmount.toString()));
    console.log("Tx2 details:", await tx_2.wait());

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
