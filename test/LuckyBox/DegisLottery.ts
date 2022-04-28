import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import { ethers } from "hardhat";
import {
  DegisLottery,
  DegisLottery__factory,
  DegisToken,
  DegisToken__factory,
  MockUSD,
  MockUSD__factory,
  RandomNumberGenerator,
  RandomNumberGenerator__factory,
  VRFMock,
  VRFMock__factory,
} from "../../typechain";

import {
  getLatestBlockTimestamp,
  getNow,
  stablecoinToWei,
  toWei,
  zeroAddress,
} from "../utils";

describe("Degis Lottery", function () {
  let DegisLottery: DegisLottery__factory, lottery: DegisLottery;
  let DegisToken: DegisToken__factory, degis: DegisToken;
  let MockUSD: MockUSD__factory, usd: MockUSD;
  let VRFMock: VRFMock__factory, rand: VRFMock;

  let dev_account: SignerWithAddress, user1: SignerWithAddress;

  beforeEach(async function () {
    [dev_account, user1] = await ethers.getSigners();

    DegisToken = await ethers.getContractFactory("DegisToken");
    degis = await DegisToken.deploy();

    MockUSD = await ethers.getContractFactory("MockUSD");
    usd = await MockUSD.deploy();

    VRFMock = await ethers.getContractFactory("VRFMock");
    rand = await VRFMock.deploy();

    DegisLottery = await ethers.getContractFactory("DegisLottery");
    lottery = await DegisLottery.deploy(
      degis.address,
      usd.address,
      rand.address
    );

    await rand.setLotteryAddress(lottery.address);

    await degis.mintDegis(dev_account.address, toWei("10000"));
    await degis.approve(lottery.address, toWei("10000"));
  });

  describe("Deployment", function () {
    it("should have the correct owner", async function () {
      expect(await lottery.owner()).to.equal(dev_account.address);
    });

    it("should not have an operator at the beginning", async function () {
      expect(await lottery.operatorAddress()).to.equal(
        ethers.constants.AddressZero
      );
    });

    it("should have the correct round weight at first", async function () {
      expect(await lottery.getCurrentRoundWeight()).to.equal(2000000);
    });
  });

  describe("Owner Functions", function () {
    it("should be able to set an operator", async function () {
      await expect(lottery.setOperatorAddress(user1.address))
        .to.emit(lottery, "OperatorAddressChanged")
        .withArgs(zeroAddress(), user1.address);
    });
  });

  describe("Main Functions", function () {
    let now: number;

    beforeEach(async function () {
      now = getNow();
    });

    it("should be able to start a lottery", async function () {
      const currentLotteryId = await lottery.currentLotteryId();
      const blockNumberBefore = await ethers.provider.getBlockNumber();
      const ts = (await ethers.provider.getBlock(blockNumberBefore)).timestamp;

      await expect(lottery.startLottery(now + 600, [2000, 2000, 2000, 2000]))
        .to.emit(lottery, "LotteryOpen")
        .withArgs(currentLotteryId.add(1), ts + 1, now + 600, 0);
    });

    it("should not be able to buy tickets before start", async function () {
      await expect(lottery.buyTickets([1234], [1])).to.be.revertedWith(
        "Current lottery is not open"
      );
    });
  });

  describe("Functions after starting a lottery", function () {
    let now: number;
    let currentLotteryId: number;
    beforeEach(async function () {
      now = getNow();

      await lottery.startLottery(now + 600, [2000, 2000, 2000, 2000]);

      currentLotteryId = (await lottery.currentLotteryId()).toNumber();
    });

    it("should not be able to buy tickets with wrong parameters", async function () {
      await expect(lottery.buyTickets([1234, 1232], [1])).to.be.revertedWith(
        "Different lengths"
      );
    });

    it("should be able to buy tickets", async function () {
      await expect(lottery.buyTickets([1234, 1235, 1236], [1, 1, 2]))
        .to.emit(lottery, "TicketsPurchase")
        .withArgs(dev_account.address, currentLotteryId, 4);

      const userTicketInfo = await lottery.viewUserAllTicketsInfo(
        dev_account.address,
        3
      );

      const roundWeight = (await lottery.getCurrentRoundWeight()).toNumber();
      const weightInfo = [1 * roundWeight, 1 * roundWeight, 2 * roundWeight];

      expect(userTicketInfo[0][0]).to.equal(BigNumber.from(1234));
      expect(userTicketInfo[0][1]).to.equal(BigNumber.from(1235));
      expect(userTicketInfo[0][2]).to.equal(BigNumber.from(1236));

      // console.log("user ticket numbers:", userTicketInfo[0]);
      // console.log("user ticket amounts:", userTicketInfo[1]);
      // console.log("user ticket weights:", userTicketInfo[2]);
    });

    it("should be able to redeem tickets", async function () {
      await lottery.buyTickets([1234, 1235], [1, 2]);

      await expect(lottery.redeemTickets([1234]))
        .to.emit(lottery, "TicketsRedeem")
        .withArgs(dev_account.address, currentLotteryId, 1);

      const userTicketInfo = await lottery.viewUserAllTicketsInfo(
        dev_account.address,
        3
      );
      // console.log("user ticket numbers:", userTicketInfo[0]);
    });

    it("should be able to inject funds", async function () {
      await usd.transfer(lottery.address, stablecoinToWei("100"));

      await lottery.updateBalance();
      const lotteryInfo = await lottery.lotteries(currentLotteryId);
      expect(lotteryInfo.totalRewards).to.equal(stablecoinToWei("100"));
    });

    it("should be able to stop a lottery", async function () {
      const now = await getLatestBlockTimestamp(ethers.provider);
      await expect(lottery.closeLottery())
        .to.emit(lottery, "LotteryClose")
        .withArgs(currentLotteryId, now + 1);

      const currentLottery = await lottery.lotteries(currentLotteryId);

      // Status 2: Closed
      expect(currentLottery.status).to.equal(2);

      const blockNumberBefore = await ethers.provider.getBlockNumber();
      const ts = (await ethers.provider.getBlock(blockNumberBefore)).timestamp;

      expect(currentLottery.endTime).to.equal(ts);
    });

    it("should be able to draw the final number and make the lottery claimable", async function () {
      await lottery.closeLottery();
      const finalNumber = await rand.randomResult();

      await expect(lottery.drawLottery())
        .to.emit(lottery, "LotteryNumberDrawn")
        .withArgs(currentLotteryId, finalNumber, 0);
    });

    it("should be able to inject funds when not open", async function () {
      await lottery.closeLottery();

      await usd.transfer(lottery.address, stablecoinToWei("100"));

      await lottery.drawLottery();

      await usd.transfer(lottery.address, stablecoinToWei("100"));
    });
  });

  describe("View Functions", function () {
    let now: number;
    let currentLotteryId: number;
    beforeEach(async function () {
      now = getNow();

      await degis.mintDegis(user1.address, toWei("10000"));
      await degis.connect(user1).approve(lottery.address, toWei("10000"));

      // Start a lottery
      await lottery.startLottery(now + 600, [2000, 2000, 2000, 2000]);

      // Buy tickets
      await lottery.buyTickets([1234, 1235], [1, 2]);
      await lottery.connect(user1).buyTickets([1234, 1235], [3, 6]);

      // Inject funds
      await usd.transfer(lottery.address, stablecoinToWei("1000"));

      currentLotteryId = (await lottery.currentLotteryId()).toNumber();
    });

    it("should be able to view a user's ticket info", async function () {
      const userTicketInfo = await lottery.viewUserAllTicketsInfo(
        dev_account.address,
        10
      );

      expect(userTicketInfo[0][0]).to.equal(1234);
      expect(userTicketInfo[0][1]).to.equal(1235);
    });

    it("should be able to get pool tickets info", async function () {
      const poolTicketInfo = await lottery.getPoolTicketsInfo(1234, 1235, 0);

      let poolTicketInfoToNumber: [number[], number[]] = [[], []];

      poolTicketInfoToNumber[0] = arrayToNumber(poolTicketInfo[0]);
      poolTicketInfoToNumber[1] = arrayToNumber(poolTicketInfo[1]);

      expect(poolTicketInfoToNumber[0][0]).to.equal(1234);
      expect(poolTicketInfoToNumber[0][1]).to.equal(1235);

      expect(poolTicketInfoToNumber[1][0]).to.equal(4);
      expect(poolTicketInfoToNumber[1][1]).to.equal(8);
    });
  });
});

function arrayToNumber(inputArray: BigNumber[]): number[] {
  let outputArray: number[] = [];
  inputArray.forEach((item, key) => {
    outputArray[key] = item.toNumber();
  });

  return outputArray;
}
