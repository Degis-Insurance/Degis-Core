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
          0
        );
    });

    it("should be able to close a lottery", async function () {
      await lottery.startLottery(
        60 * 60 * 24 * 3 + now,
        toWei("10"),
        [4000, 3000, 2000, 1000],
        0
      );
      const currentLotteryId = await lottery.currentLotteryId();
      await expect(lottery.closeLottery(currentLotteryId))
        .to.emit(lottery, "LotteryClosed")
        .withArgs(1);
    });

    it("should be able to open a claim period", async function () {
      await lottery.startLottery(
        60 * 60 * 24 * 3 + now,
        toWei("10"),
        [4000, 3000, 2000, 1000],
        0
      );
      const currentLotteryId = await lottery.currentLotteryId();
      lottery.closeLottery(BigNumber.from(currentLotteryId));
      await lottery.setTreasury(dev_account.address);
      await expect(
        lottery.drawFinalNumberAndMakeLotteryClaimable(
          BigNumber.from(currentLotteryId),
          false
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
        [4000, 3000, 2000, 1000],
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
      ).to.be.revertedWith("Ticket number is outside the range");
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
        [4000, 3000, 2000, 1000],
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
    let winnerTicket: BigNumber;

    beforeEach(async function () {
      now = getNow();

      await lottery.startLottery(
        60 * 60 * 24 * 3 + now,
        toWei("10"),
        [4000, 3000, 2000, 1000],
        0
      );
      // 0,     1,     2,     3,      4,    5,      6,    7,      8
      // 0,     one,   two   three,   four, oneB,   twoB, threeB, fourB
      await lottery.buyTickets([
        11111, 19111, 15911, 15971, 15975, 19111, 19511, 19551, 19557,
      ]);
      lotteryId = await lottery.currentLotteryId();
      await lottery.setTreasury(dev_account.address);
      await lottery.closeLottery(lotteryId);
      await lottery.drawFinalNumberAndMakeLotteryClaimable(lotteryId, false);
      winnerTicket = await rng.randomResult();
    });

    it("should not be able to buy tickets if lottery is claimable", async function () {
      await expect(lottery.buyTickets([11111])).to.be.revertedWith(
        "Current lottery round not open"
      );
    });

    it("it should get reward equivalent to one correct number in right order", async function () {
      await expect(lottery.claimTickets(1, [1], [0])).to.emit(
        lottery,
        "TicketsClaimed"
      );
    });

    it("it should get reward equivalent to two correct numbers in right order", async function () {
      await expect(lottery.claimTickets(1, [2], [1])).to.emit(
        lottery,
        "TicketsClaimed"
      );
    });

    it("it should get reward equivalent to three correct numbers in right order", async function () {
      await expect(lottery.claimTickets(1, [3], [2])).to.emit(
        lottery,
        "TicketsClaimed"
      );
    });

    it("it should get reward equivalent to four correct numbers in right order", async function () {
      await expect(lottery.claimTickets(1, [4], [3])).to.emit(
        lottery,
        "TicketsClaimed"
      );
    });

    it("it should get reward equivalent to one correct number in wrong order", async function () {
      await expect(lottery.claimTickets(1, [5], [0])).to.emit(
        lottery,
        "TicketsClaimed"
      );
    });

    it("it should get reward equivalent to two correct numbers in wrong order", async function () {
      await expect(lottery.claimTickets(1, [6], [1])).to.emit(
        lottery,
        "TicketsClaimed"
      );
    });

    it("it should get reward equivalent to three correct numbers in wrong order", async function () {
      await expect(lottery.claimTickets(1, [7], [2])).to.emit(
        lottery,
        "TicketsClaimed"
      );
    });

    it("it should get reward equivalent to four correct numbers in wrong order", async function () {
      await expect(lottery.claimTickets(1, [8], [3])).to.emit(
        lottery,
        "TicketsClaimed"
      );
    });

    it("should be able to claim all tickets", async function () {
      await expect(
        lottery.claimTickets(
          1,
          [1, 2, 3, 4, 5, 6, 7, 8],
          [0, 1, 2, 3, 0, 1, 2, 3]
        )
      ).to.emit(lottery, "TicketsClaimed");
    });

    it("it should not get rewards if claiming non existent ticketId", async function () {
      await expect(lottery.claimTickets(1, [10], [0])).to.be.revertedWith(
        "Ticket id too large"
      );
    });

    it("it should not get rewards if diverging input length in bracket and ticketIds", async function () {
      await expect(lottery.claimTickets(1, [1], [3, 0])).to.be.revertedWith(
        "Not same length"
      );
    });

    it("it should not be able to claim not owned tickets", async function () {
      await expect(
        lottery.connect(user1).claimTickets(1, [4], [3])
      ).to.be.revertedWith("Not the ticket owner or already claimed");
    });
  });
});
