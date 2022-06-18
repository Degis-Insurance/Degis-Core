import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import { ethers, upgrades } from "hardhat";
import {
  DegisLotteryV2,
  DegisLotteryV2__factory,
  DegisToken,
  DegisToken__factory,
  VRFMock,
  VRFMock__factory,
  OwnableUpgradeable,
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
  let RandomNumberGenerator: VRFMock__factory, rng: VRFMock;
  let tenTicketsArray: number[], elevenTicketsArray: number[];

  beforeEach(async function () {
    [dev_account, user1] = await ethers.getSigners();
    DegisToken = await ethers.getContractFactory("DegisToken");
    degis = await DegisToken.deploy();

    RandomNumberGenerator = await ethers.getContractFactory("VRFMock");
    rng = await RandomNumberGenerator.deploy();

    DegisLottery = await ethers.getContractFactory("DegisLotteryV2");
    lottery = await DegisLottery.deploy();
    await lottery.deployed();
    await lottery.initialize(degis.address, rng.address);

    await rng.setLotteryAddress(lottery.address);

    await degis.mintDegis(dev_account.address, toWei("20000"));
    await degis.approve(lottery.address, toWei("20000"));
    await degis.transfer(user1.address, toWei("10000"));
    await degis.connect(user1).approve(lottery.address, toWei("10000"));
    await lottery.setMaxNumberTicketsEachTime(BigNumber.from(10));

    tenTicketsArray = [
      11234, 14321, 12222, 11111, 19999, 18888, 17777, 16666, 15555, 14444,
    ];
    elevenTicketsArray = [
      11234, 14321, 12222, 11111, 19999, 18888, 17777, 16666, 15555, 14444,
      13333,
    ];
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
      await lottery.setMaxNumberTicketsEachTime(BigNumber.from(5));
      expect(await lottery.maxNumberTicketsEachTime()).to.equal(
        BigNumber.from(5)
      );
    });

    it("should be able to increase maxNumberTicketsEachTime", async function () {
      await lottery.setMaxNumberTicketsEachTime(BigNumber.from(20));
      expect(await lottery.maxNumberTicketsEachTime()).to.equal(
        BigNumber.from(20)
      );
    });

    it("should be able to start a lottery", async function () {
      const currentLotteryId = await lottery.currentLotteryId();
      now = await getLatestBlockTimestamp(ethers.provider);
      await expect(
        lottery.startLottery(
          60 * 60 * 24 * 3 + now,
          toWei("10"),
          [4000, 3000, 2000, 1000],
          0
        )
      )
        .to.emit(lottery, "LotteryOpen")
        .withArgs(
          currentLotteryId.add(1),
          now + 1,
          60 * 60 * 24 * 3 + now,
          toWei("10"),
          [4000, 3000, 2000, 1000],
          0
        );
    });

    it("should not be able to start a lottery if rewards breakdown too high", async function () {
      await expect(
        lottery.startLottery(
          60 * 60 * 24 * 3 + now,
          toWei("10"),
          [4000, 3000, 2000, 1001],
          0
        )
      ).to.be.revertedWith("Rewards breakdown too high");
    });

    it("should be able to close a lottery", async function () {
      await lottery.startLottery(
        60 * 60 * 24 * 3 + now,
        toWei("10"),
        [1000, 2000, 3000, 4000],
        0
      );
      const currentLotteryId = await lottery.currentLotteryId();
      await expect(lottery.closeLottery(currentLotteryId))
        .to.emit(lottery, "LotteryClose")
        .withArgs(1);
    });

    it("should be able to open a claim period", async function () {
      await lottery.startLottery(
        60 * 60 * 24 * 3 + now,
        toWei("10"),
        [1000, 2000, 3000, 4000],
        0
      );
      const currentLotteryId = await lottery.currentLotteryId();
      lottery.closeLottery(BigNumber.from(currentLotteryId));
      await lottery.setTreasury(dev_account.address);
      await expect(
        lottery.drawFinalNumberAndMakeLotteryClaimable(
          BigNumber.from(currentLotteryId),
          true
        )
      ).to.emit(lottery, "LotteryNumberDrawn");
    });
  });

  describe("non existent lottery", async function () {
    let now: number;
    beforeEach(async function () {
      now = getNow();
    });

    it("should not be able to buy tickets if there is no lottery", async function () {
      await expect(lottery.buyTickets([11111])).to.be.revertedWith(
        "Current lottery round not open"
      );
    });

    it("should not be able to claim tickets if there is no lottery", async function () {
      await expect(
        lottery.claimTickets(1, [11111], [BigNumber.from(0)])
      ).to.be.revertedWith("Not claimable");
    });

    it("should not allow non owner to open lotteries", async function () {
      await expect(
        lottery
          .connect(user1)
          .startLottery(
            60 * 60 * 24 * 3 + now,
            toWei("10"),
            [4000, 3000, 2000, 1000],
            0
          )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("lottery with open status", function () {
    let now: number;

    beforeEach(async function () {
      now = getNow();

      await lottery.startLottery(
        60 * 60 * 24 * 3 + now,
        toWei("10"),
        [1000, 2000, 3000, 4000],
        0
      );
    });

    it("any participant should be able to buy 10 tickets", async function () {
      await expect(lottery.connect(user1).buyTickets(tenTicketsArray)).to.emit(
        lottery,
        "TicketsPurchased"
      );
      const ticket = await lottery._userTicketIds(user1.address, 1, 2);
      expect(ticket).to.equal(2);
    });

    it("should not be able to buy 11 tickets", async function () {
      await expect(
        lottery.connect(user1).buyTickets(elevenTicketsArray)
      ).to.be.revertedWith("Too many tickets");
    });

    it("should be able to buy 11 tickets after changes", async function () {
      await lottery.setMaxNumberTicketsEachTime(11);
      await expect(
        lottery.connect(user1).buyTickets(elevenTicketsArray)
      ).to.emit(lottery, "TicketsPurchased");
    });

    it("should not be able to buy more than 11 tickets after reduction", async function () {
      await lottery.setMaxNumberTicketsEachTime(11);
      await lottery.setMaxNumberTicketsEachTime(10);
      await expect(
        lottery.connect(user1).buyTickets(elevenTicketsArray)
      ).to.be.revertedWith("Too many tickets");
    });

    // it shoud not be able to buy 0 tickets
    it("should not be able to buy 0 tickets", async function () {
      await expect(lottery.connect(user1).buyTickets([])).to.be.revertedWith(
        "No tickets are being bought"
      );
    });

    it("should not be able to buy tickets if given bad numbers", async function () {
      await expect(
        lottery.connect(user1).buyTickets([999, 20000])
      ).to.be.revertedWith("Ticket number is outside range");
    });
  });

  describe("lottery with closed status", function () {
    let now: number;
    let lotteryId: BigNumber;

    beforeEach(async function () {
      now = getNow();

      await lottery.startLottery(
        60 * 60 * 24 * 3 + now,
        toWei("10"),
        [1000, 2000, 3000, 4000],
        0
      );
      lotteryId = await lottery.currentLotteryId();
      await lottery.closeLottery(lotteryId);
    });
    it("should not be able to buy tickets if lottery is closed", async function () {
      await expect(lottery.buyTickets([11111])).to.be.revertedWith(
        "Current lottery round not open"
      );
    });
    it("should not be able to claim tickets if lottery is closed", async function () {});
  });

  describe("lottery with claimable status", function () {
    let now: number;
    let lotteryId: BigNumber;

    let finalNumber: number;

    beforeEach(async function () {
      now = getNow();

      await lottery.startLottery(
        60 * 60 * 24 * 3 + now,
        toWei("10"),
        [1000, 2000, 3000, 4000],
        0
      );
      // 0,     1,     2,     3,      4,    5,      6,    7,      8
      // 0,     one,   two   three,   four, oneB,   twoB, threeB, fourB
      await lottery.buyTickets([
        11111, 11115, 11175, 11975, 15975, 19557, 15111, 19571, 17559,
      ]);
      lotteryId = await lottery.currentLotteryId();
      await lottery.setTreasury(dev_account.address);
      await lottery.closeLottery(lotteryId);
      await lottery.drawFinalNumberAndMakeLotteryClaimable(lotteryId, true);
      const lotteryInfo = await lottery.lotteries(lotteryId);
      finalNumber = lotteryInfo.finalNumber;
    });

    it("should not be able to buy tickets if lottery is claimable", async function () {
      await expect(lottery.buyTickets([11111])).to.be.revertedWith(
        "Current lottery round not open"
      );
    });

    it("it should get reward equivalent to one correct number in right order", async function () {
      await expect(lottery.claimTickets(1, [1], [0])).to.emit(
        lottery,
        "TicketsClaim"
      );
    });

    it("it should get reward equivalent to two correct numbers in right order", async function () {
      await expect(lottery.claimTickets(1, [2], [1])).to.emit(
        lottery,
        "TicketsClaim"
      );
    });

    it("it should get reward equivalent to three correct numbers in right order", async function () {
      await expect(lottery.claimTickets(1, [3], [2])).to.emit(
        lottery,
        "TicketsClaim"
      );
    });

    it("it should get reward equivalent to four correct numbers in right order", async function () {
      try {
        const rewardsPerBracket = await lottery.getRewardPerTicketInBracket(
          lotteryId
        );
        const numberTicketsBracket1 = await lottery._numberTicketsPerLotteryId(
          lotteryId,
          6
        );
        const numberTicketsBracket2 = await lottery._numberTicketsPerLotteryId(
          lotteryId,
          86
        );
        const numberTicketsBracket3 = await lottery._numberTicketsPerLotteryId(
          lotteryId,
          1086
        );
        const numberTicketsBracket4 = await lottery._numberTicketsPerLotteryId(
          lotteryId,
          7086
        );
        console.log("1", numberTicketsBracket1);
        console.log("2", numberTicketsBracket2);
        console.log("3", numberTicketsBracket3);
        console.log("4", numberTicketsBracket4);
        console.log("rewardsPerBracket", rewardsPerBracket);
        console.log("finalNumber", finalNumber);
        const userTicketIds = await lottery._userTicketIds(
          dev_account.address,
          1,
          4
        );
        console.log(await lottery.tickets(userTicketIds.toNumber()));
        await expect(lottery.claimTickets(1, [4], [3]))
          .to.emit(lottery, "TicketsClaim")
          .withArgs(dev_account.address, toWei("10"), 1);
      } catch (e) {
        console.log("error", e);
      }
    });

    it("should be able to get multiple rewards equivalent to specified tickets in right order", async function () {
      await expect(lottery.claimTickets(1, [3, 4], [2, 3])).to.emit(
        lottery,
        "TicketsClaim"
      );
    });

    it("should not get reward equivalent to one correct number in wrong order", async function () {
      await expect(lottery.claimTickets(1, [5], [0])).to.be.revertedWith(
        "No prize"
      );
    });

    it("should not get reward equivalent to two correct numbers in wrong order", async function () {
      await expect(lottery.claimTickets(1, [6], [1])).to.be.revertedWith(
        "No prize"
      );
    });

    it("should not get reward equivalent to three correct numbers in wrong order", async function () {
      await expect(lottery.claimTickets(1, [7], [2])).to.be.revertedWith(
        "No prize"
      );
    });

    it("should not get reward equivalent to four correct numbers in wrong order", async function () {
      await expect(lottery.claimTickets(1, [8], [3])).to.be.revertedWith(
        "No prize"
      );
    });

    it("should be able to claim all tickets", async function () {
      await expect(lottery.claimAllTickets(1)).to.emit(lottery, "TicketsClaim");
    });

    it("should not get rewards if claiming non existent ticketId", async function () {
      await expect(lottery.claimTickets(1, [10], [0])).to.be.revertedWith(
        "Ticket id too large"
      );
    });

    it("should not get rewards if diverging input length in bracket and ticketIds", async function () {
      await expect(lottery.claimTickets(1, [1], [3, 0])).to.be.revertedWith(
        "Not same length"
      );
    });

    it("should not be able to claim not owned tickets", async function () {
      await expect(
        lottery.connect(user1).claimTickets(1, [4], [3])
      ).to.be.revertedWith("Not the ticket owner or already claimed");
    });

    it("should have allocated rewards to next lottery", async function () {
      expect(await lottery.pendingInjectionNextLottery()).to.be.above(0);
    });
  });

  describe("past lotteries", async function () {
    let now: number;
    let lotteryId: BigNumber;

    let finalNumber: number;

    beforeEach(async function () {
      now = getNow();

      await lottery.startLottery(
        60 * 60 * 24 * 3 + now,
        toWei("10"),
        [1000, 2000, 3000, 4000],
        0
      );
      // 0,     1,     2,     3,      4,    5,      6,    7,      8
      // 0,     one,   two   three,   four, oneB,   twoB, threeB, fourB
      await lottery.buyTickets([
        11111, 11115, 11175, 11975, 15975, 19557, 15111, 19571, 17559,
      ]);
      lotteryId = await lottery.currentLotteryId();
      await lottery.setTreasury(dev_account.address);
      await lottery.closeLottery(lotteryId);
      await lottery.drawFinalNumberAndMakeLotteryClaimable(lotteryId, true);
      const lotteryInfo = await lottery.lotteries(lotteryId);
      finalNumber = lotteryInfo.finalNumber;

      // claim only half of winning tickets
      await lottery.claimTickets(1, [3, 4], [2, 3]);
      await lottery.startLottery(
        60 * 60 * 24 * 3 + now,
        toWei("10"),
        [1000, 2000, 3000, 4000],
        0
      );
      await lottery.buyTickets([
        11111, 11115, 11175, 11975, 15975, 19557, 15111, 19571, 17559,
      ]);
      await lottery.closeLottery(2);
      await lottery.drawFinalNumberAndMakeLotteryClaimable(2, true);
    });

    it("should be able to claim unclaimed previous tickets", async function () {
      await expect(lottery.claimTickets(1, [1, 2], [0, 1])).to.emit(
        lottery,
        "TicketsClaim"
      );
    });

    it("should not be able to claim already claimed previous tickets", async function () {
      await expect(lottery.claimTickets(1, [3, 4], [2, 3])).to.be.revertedWith(
        "Not the ticket owner or already claimed"
      );
    });

    it("should not be able to claim unclaimed previous tickets if not owner", async function () {
      await expect(
        lottery.connect(user1).claimTickets(1, [1, 2], [0, 1])
      ).to.be.revertedWith("Not the ticket owner or already claimed");
    });

    it("should not be able to claim alreadt claimed previous tickets as not owner", async function () {
      await expect(
        lottery.connect(user1).claimTickets(1, [1, 2], [0, 1])
      ).to.be.revertedWith("Not the ticket owner or already claimed");
    });

    it("should be able to claim previous tickets despite current lottery fully claimed", async function () {
      await expect(lottery.claimAllTickets(2)).to.emit(lottery, "TicketsClaim");
      await expect(lottery.claimTickets(1, [1, 2], [0, 1])).to.emit(
        lottery,
        "TicketsClaim"
      );
    });
  });
});
