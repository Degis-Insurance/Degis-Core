import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import { readAddressList } from "../../scripts/contractAddress";

import {
  DegisLottery,
  DegisLotteryV2,
  DegisLotteryV2__factory,
  DegisLottery__factory,
  DegisToken,
  DegisToken__factory,
  RandomNumberGeneratorV2,
  RandomNumberGeneratorV2__factory,
} from "../../typechain";
import { parseUnits } from "ethers/lib/utils";

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
    const lotteryAddress = addressList[network.name].DegisLotteryV2;
    const lottery: DegisLotteryV2 = new DegisLotteryV2__factory(
      dev_account
    ).attach(lotteryAddress);

    const tx = await lottery
      .startLottery
      // endTime,
      // 0,
      // [1000, 2000, 3000, 4000]
      // 1000
      ();
    console.log("Tx details: ", await tx.wait());
  });

task("closeLotteryRound", "Settle the current lottery round").setAction(
  async (_, hre) => {
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    // Get lottery contract instance
    const lotteryAddress = addressList[network.name].DegisLotteryV2;
    const lottery: DegisLotteryV2 = new DegisLotteryV2__factory(
      dev_account
    ).attach(lotteryAddress);

    const currentRound = await lottery.currentLotteryId();

    const tx = await lottery.closeLottery(currentRound);
    console.log("Tx details: ", await tx.wait());

    const lotteryInfo = await lottery.lotteries(currentRound);
    console.log("lottery end", lotteryInfo.endTime.toString());
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
    const lotteryAddress = addressList[network.name].DegisLotteryV2;
    const lottery: DegisLotteryV2 = new DegisLotteryV2__factory(
      dev_account
    ).attach(lotteryAddress);

    const currentRound = await lottery.currentLotteryId();

    console.log("current round: ", currentRound);

    const rand = await lottery.randomGenerator();
    console.log("random generator: ", rand);

    // const tx = await lottery.drawFinalNumberAndMakeLotteryClaimable(
    //   currentRound,
    //   true
    // );
    // console.log("Tx details: ", await tx.wait());
  }
);

task("requestRandom", "Request random number by VRF").setAction(
  async (_, hre) => {
    const { network } = hre;

    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    const randAddress = addressList[network.name].RandomNumberGeneratorV2;
    const rand: RandomNumberGeneratorV2 = new RandomNumberGeneratorV2__factory(
      dev_account
    ).attach(randAddress);

    const tx = await rand.requestRandomWords();
    console.log("Tx details: ", await tx.wait());
  }
);

task("checkRandom", "Check random number result").setAction(async (_, hre) => {
  const { network } = hre;

  const [dev_account] = await hre.ethers.getSigners();
  console.log("The default signer is: ", dev_account.address);

  const addressList = readAddressList();

  const randAddress = addressList[network.name].RandomNumberGeneratorV2;
  const rand: RandomNumberGeneratorV2 = new RandomNumberGeneratorV2__factory(
    dev_account
  ).attach(randAddress);

  const res = await rand.randomResult();
  console.log("Random result: ", res.toString());

  const latestId = await rand.latestLotteryId();
  console.log("Latest lottery id: ", latestId.toString());

  const owner = await rand.owner();
  console.log("owner: ", owner);
});

task("setRoundLength", "Set length for a lottery round")
  .addParam("length", "Length of the round", null, types.int)
  .setAction(async (taskArgs, hre) => {
    const { network } = hre;

    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    // Get lottery contract instance
    const lotteryAddress = addressList[network.name].DegisLotteryV2;
    const lottery: DegisLotteryV2 = new DegisLotteryV2__factory(
      dev_account
    ).attach(lotteryAddress);

    const tx = await lottery.setRoundLength(taskArgs.length);
    console.log("Tx details: ", await tx.wait());
  });

task("buyTickets", "Buy tickets").setAction(async (_, hre) => {
  const { network } = hre;

  const [dev_account] = await hre.ethers.getSigners();
  console.log("The default signer is: ", dev_account.address);

  const addressList = readAddressList();

  // Get lottery contract instance
  const lotteryAddress = addressList[network.name].DegisLotteryV2;
  const lottery: DegisLotteryV2 = new DegisLotteryV2__factory(
    dev_account
  ).attach(lotteryAddress);

  const degisAddress = addressList[network.name].DegisToken;
  const degis: DegisToken = new DegisToken__factory(dev_account).attach(
    degisAddress
  );

  const ap = await degis.approve(lottery.address, parseUnits("20000"));

  const tickets = [11125, 12345];

  const tx = await lottery.buyTickets(tickets);
  console.log("Tx details: ", await tx.wait());
});
