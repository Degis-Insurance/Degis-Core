import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import { ethers } from "hardhat";
import {
  DegisLotteryV2,
  DegisLotteryV2__factory,
  DegisToken,
  DegisToken__factory,
  RandomNumberGenerator,
  RandomNumberGenerator__factory,
} from "../../typechain";

import {
  getLatestBlockTimestamp,
  getNow,
  stablecoinToWei,
  toWei,
  zeroAddress,
} from "../utils";

describe("Degis Lottery V2", function () {
  let DegisLottery: DegisLotteryV2__factory, lottery: DegisLotteryV2;
  let DegisToken: DegisToken__factory, degis: DegisToken;
  let dev_account: SignerWithAddress, user1: SignerWithAddress;
  let RandomNumberGenerator: RandomNumberGenerator__factory,
    rng: RandomNumberGenerator;

  beforeEach(async function () {
    [dev_account, user1] = await ethers.getSigners();
    DegisToken = await ethers.getContractFactory("DegisToken");
    degis = await DegisToken.deploy();

    RandomNumberGenerator = await ethers.getContractFactory(
      "RandomNumberGenerator"
    );
    rng = await RandomNumberGenerator.deploy();

    DegisLottery = await ethers.getContractFactory("DegisLotteryV2");
    lottery = await DegisLottery.deploy(degis.address, rng.address);

    await rng.setLotteryAddress(lottery.address);

    await degis.mintDegis(dev_account.address, toWei("20000"));
    await degis.approve(lottery.address, toWei("20000"));
    await degis.transfer(user1.address, toWei("10000"));
    await degis.connect(user1).approve(lottery.address, toWei("10000"));
    await degis.connect(dev_account);
    await lottery.setMaxNumberTicketsEachTime(10);
  });

  describe("Deployment", function () {
    it("should have the correct owner", async function () {
      expect(await lottery.owner()).to.equal(dev_account.address);
    });

    it("should have set maxNumberTicketsEachTime to 10", async function () {
      expect(await lottery.maxNumberTicketsEachTime()).to.equal(
        BigNumber.from(10)
      );
    });

    it("should not have any lotteries", async function () {
      expect(await lottery.currentLotteryId()).to.equal(0);
    });
  });

  describe("Owner Functions", function () {
    let now: number;

    beforeEach(async function () {
      now = getNow();
    });

    it("should be able to lower maxNumberTicketsEachTime", async function () {
      await lottery.setMaxNumberTicketsEachTime(5);
      expect(await lottery.maxNumberTicketsEachTime()).to.equal(
        BigNumber.from(5)
      );
    });

    it("should be able to increase maxNumberTicketsEachTime", async function () {
      await lottery.setMaxNumberTicketsEachTime(20);
      expect(await lottery.maxNumberTicketsEachTime()).to.equal(
        BigNumber.from(20)
      );
    });

    it("should be able to start a lottery", async function () {
      const currentLotteryId = await lottery.currentLotteryId();
      const provider = await ethers.getDefaultProvider();
      const ts = await getLatestBlockTimestamp(provider);
      await expect(
        lottery
          .startLottery(
            60 * 60 * 24 * 3 + now,
            toWei("10"),
            [4000, 3000, 2000, 1000],
            0
          )
          .to.emit(lottery, "LoterryOpen")
          .withArgs(
            currentLotteryId + 1,
            ts + 1,
            60 * 60 * 24 * 3 + now,
            toWei("10"),
            0
          )
      );
    });

    it("should be able to close a lottery", async function () {
      await expect(lottery.closeLottery(1))
        .to.emit(lottery, "LoterryClosed")
        .withArgs(1);
    });

    it("should be able to open a claim period", async function () {
      await expect(
        lottery.drawFinalNumberAndMakeLotteryClaimable(1, false)
      ).to.emit(lottery, "LotteryNumberDrawn");
    });
  });

  describe("Main Functions", function () {
    let tenTicketsArray: number[], elevenTicketsArray: number[];
    let now: number;

    beforeEach(async function () {
      tenTicketsArray = [
        1234, 4321, 2222, 1111, 9999, 8888, 7777, 6666, 5555, 4444,
      ];
      elevenTicketsArray = [
        1234, 4321, 2222, 1111, 9999, 8888, 7777, 6666, 5555, 4444, 3333,
      ];
      now = getNow();

      await lottery.startLottery(
        60 * 60 * 24 * 3 + now,
        toWei("10"),
        [4000, 3000, 2000, 1000],
        0
      );
    });

    it("any participant should be able to buy 10 tickets", async function () {
      await lottery.connect(user1).buyTickets(tenTicketsArray);
      expect(await lottery.userTicketIds[user1.address].length().to.equal(10));
    });

    it("should not be able to buy 11 tickets", async function () {
      await expect(
        lottery.connect(user1).buyTickets(elevenTicketsArray)
      ).to.be.revertedWith("Too many tickets");
    });

    it("should be able to buy 11 tickets after changes", async function () {
      await lottery.setMaxNumberTicketsEachTime(11);
      await lottery.connect(user1).buyTickets(elevenTicketsArray);
      expect(await lottery._userTicketIds[user1.address].length().to.equal(21));
    });

    // it should not be able to buy more than maxNumberTicketsEachTime
    it("should not be able to buy more than 11 tickets after reduction", async function () {
      await lottery.setMaxNumberTicketsEachTime(10);
      await expect(lottery.connect(user1).buyTickets(11)).to.be.revertedWith(
        "Too many tickets"
      );
    });

    // it shoud not be able to buy 0 tickets
    it("should not be able to buy 0 tickets", async function () {
      await expect(lottery.connect(user1).buyTickets([])).to.be.revertedWith(
        "No tickets are being bought"
      );
    });

    // it should not be able to buy tickets if the lottery is closed
    it("should not be able to buy tickets if the lottery is closed", async function () {
      const lotteryId = await lottery.currentLotteryId();
      await lottery.connect(dev_account).closeLottery(lotteryId);
      await expect(lottery.buyTickets([1111])).to.be.revertedWith(
        "Current lottery round not open"
      );
    });

    // it should not be able to buy tickets if the lottery is closed and the claim period is open
    it("should not be able to buy tickets if the lottery is closed", async function () {
      const lotteryId = await lottery.currentLotteryId();
      await lottery.drawFinalNumberAndMakeLotteryClaimable(lotteryId, false);
      await expect(lottery.buyTickets([1111])).to.be.revertedWith(
        "Current lottery round not open"
      );
    });
  });
});
