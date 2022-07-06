import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, Signer } from "ethers";
import { formatEther, parseUnits } from "ethers/lib/utils";
import { ethers } from "hardhat";
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
  let dev_account: SignerWithAddress, user1: SignerWithAddress;
  let treasury: SignerWithAddress;

  let DegisLottery: DegisLotteryV2__factory, lottery: DegisLotteryV2;
  let DegisToken: DegisToken__factory, degis: DegisToken;

  let RandomNumberGenerator: VRFMock__factory, rng: VRFMock;
  let tenTicketsArray: number[], elevenTicketsArray: number[];

  const defaultRewardBreakdown: [
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish
  ] = [
    BigNumber.from(1000),
    BigNumber.from(2000),
    BigNumber.from(3000),
    BigNumber.from(4000),
  ];

  const treasuryFee = 0;
  const realTreasuryFee = 2000;

  beforeEach(async function () {
    [dev_account, user1, treasury] = await ethers.getSigners();

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

    await lottery.setTreasury(treasury.address);

    //  1,     2,     3,      4,    5,      6,    7,      8,   9, 10
    // one,   two   three,   four, oneB,   twoB, threeB, fourB, C, D
    tenTicketsArray = [
      11115, 11145, 11345, 12345, 13452, 12453, 15423, 15234, 19999, 11111,
    ];
    elevenTicketsArray = [
      11115, 11145, 11345, 12345, 13452, 12453, 15423, 15234, 19999, 14444,
      11111,
    ];
  });

  describe("Deployment", function () {
    it("should have the correct owner", async function () {
      expect(await lottery.owner()).to.equal(dev_account.address);
    });

    it("should have set maxNumberTicketsEachTime to 10", async function () {
      expect(await lottery.maxNumberTicketsEachTime()).to.equal(10);
    });

    it("should not have any lotteries", async function () {
      expect(await lottery.currentLotteryId()).to.equal(0);
    });

    it("should have the correct ticket number range", async function () {
      expect(await lottery.MAX_TICKET_NUMBER()).to.equal(19999);
      expect(await lottery.MIN_TICKET_NUMBER()).to.equal(10000);
    });

    it("should have the correct discount divisor", async function () {
      expect(await lottery.DISCOUNT_DIVISOR()).to.equal(98);
    });
  });

  describe("VRF Mock Functions", function () {
    it("should be able to have the correct lottery address", async function () {
      expect(await rng.DegisLottery()).to.equal(lottery.address);
    });

    it("should be able to have correct initial seed and result", async function () {
      expect(await rng.seed()).to.equal(0);
      expect(await rng.randomResult()).to.equal(0);
    });

    it("should be able to get random result", async function () {
      await rng.requestRandomWords();
      expect(await rng.seed()).to.equal(1);
      expect(await rng.randomResult()).to.equal(12345);

      await rng.requestRandomWords();
      expect(await rng.seed()).to.equal(2);
      expect(await rng.randomResult()).to.equal(14690);
    });
  });

  describe("Owner Functions", function () {
    let now: number;
    const roundLength = 60 * 60 * 24 * 7; // 1 week

    it("should be able to change maxNumberTicketsEachTime", async function () {
      // Decrease
      await lottery.setMaxNumberTicketsEachTime(5);
      expect(await lottery.maxNumberTicketsEachTime()).to.equal(5);

      // Increase
      await lottery.setMaxNumberTicketsEachTime(15);
      expect(await lottery.maxNumberTicketsEachTime()).to.equal(15);
    });

    it("should be able to start a lottery", async function () {
      const currentLotteryId = await lottery.currentLotteryId();
      now = await getLatestBlockTimestamp(ethers.provider);

      const initStatus = await lottery.lotteries(currentLotteryId.add(1));
      expect(initStatus.status).to.equal(0);

      await expect(
        lottery.startLottery(
          now + roundLength,
          toWei("10"),
          defaultRewardBreakdown, // 10%, 20%, 30%, 40% for 80% of total prize pool
          treasuryFee
        )
      )
        .to.emit(lottery, "LotteryOpen")
        .withArgs(
          currentLotteryId.add(1),
          now + 1,
          now + roundLength,
          toWei("10"),
          defaultRewardBreakdown,
          treasuryFee
        );

      const status = await lottery.lotteries(currentLotteryId.add(1));
      expect(status.startTime).to.equal(now + 1);
      expect(status.status).to.equal(1);
      expect(status.treasuryFee).to.equal(treasuryFee);
      expect(status.finalNumber).to.equal(0);
      expect(status.firstTicketId).to.equal(1);
      expect(status.firstTicketIdNextRound).to.equal(0);
      expect(status.amountCollected).to.equal(0);
      expect(status.pendingRewards).to.equal(0);
    });

    it("should not be able to start a lottery if rewards breakdown too high", async function () {
      now = await getLatestBlockTimestamp(ethers.provider);
      await expect(
        lottery.startLottery(
          now + roundLength,
          toWei("10"),
          [1001, 2000, 3000, 4000],
          treasuryFee
        )
      ).to.be.revertedWith("Rewards breakdown too high");
    });

    it("should be able to close a lottery", async function () {
      now = await getLatestBlockTimestamp(ethers.provider);
      await lottery.startLottery(
        now + roundLength,
        toWei("10"),
        defaultRewardBreakdown,
        treasuryFee
      );
      const currentLotteryId = await lottery.currentLotteryId();

      await expect(lottery.closeLottery(currentLotteryId))
        .to.emit(lottery, "LotteryClose")
        .withArgs(1);

      const status = await lottery.lotteries(currentLotteryId);
      expect(status.status).to.equal(2); // 2 = closed
    });

    it("should be able to draw final number and make the round claimable", async function () {
      now = await getLatestBlockTimestamp(ethers.provider);
      await lottery.startLottery(
        now + roundLength,
        toWei("10"),
        defaultRewardBreakdown,
        treasuryFee
      );

      const currentLotteryId = await lottery.currentLotteryId();

      await lottery.closeLottery(currentLotteryId);

      // Random result: 12345 * 1 % 10000 + 10000
      await expect(
        lottery.drawFinalNumberAndMakeLotteryClaimable(currentLotteryId, true)
      )
        .to.emit(lottery, "LotteryNumberDrawn")
        .withArgs(currentLotteryId, 12345, 0);

      const status = await lottery.lotteries(currentLotteryId);
      expect(status.finalNumber).to.equal(12345);
    });

    it("should not be able to reset random generator address when not claimable", async function () {
      await expect(
        lottery.changeRandomGenerator(rng.address)
      ).to.be.revertedWith("Round not claimable");
    });

    it("should be able to inject funds", async function () {
      now = await getLatestBlockTimestamp(ethers.provider);
      await lottery.startLottery(
        now + roundLength,
        toWei("10"),
        defaultRewardBreakdown,
        treasuryFee
      );

      const lotteryId = await lottery.currentLotteryId();

      await lottery.injectFunds(toWei("10"));
      expect((await lottery.lotteries(lotteryId)).amountCollected).to.equal(
        toWei("10")
      );

      await lottery.injectFunds(toWei("20"));
      expect((await lottery.lotteries(lotteryId)).amountCollected).to.equal(
        toWei("30")
      );
    });

    it("should not be able to withdraw degis tokens", async function () {
      now = await getLatestBlockTimestamp(ethers.provider);
      await lottery.startLottery(
        now + roundLength,
        toWei("10"),
        defaultRewardBreakdown,
        0
      );

      await lottery.injectFunds(toWei("10"));

      await expect(
        lottery.recoverWrongTokens(degis.address, toWei("10"))
      ).to.be.revertedWith("Cannot be DEGIS token");
    });
  });

  describe("Non existent lottery", async function () {
    let now: number;
    const roundLength = 60 * 60 * 24 * 7; // 1 week

    it("should not be able to buy tickets if round is not open", async function () {
      await expect(lottery.buyTickets([11111])).to.be.revertedWith(
        "Round not open"
      );
    });

    it("should not be able to claim tickets if round is not claimable", async function () {
      await expect(lottery.claimTickets(1, [11111], [0])).to.be.revertedWith(
        "Round not claimable"
      );
    });

    it("should not allow non owner to open lotteries", async function () {
      now = await getLatestBlockTimestamp(ethers.provider);
      await expect(
        lottery
          .connect(user1)
          .startLottery(
            now + roundLength,
            toWei("10"),
            defaultRewardBreakdown,
            treasuryFee
          )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Lottery with open status", function () {
    let now: number;
    const roundLength = 60 * 60 * 24 * 7; // 1 week

    beforeEach(async function () {
      now = await getLatestBlockTimestamp(ethers.provider);

      await lottery.startLottery(
        now + roundLength,
        toWei("10"),
        defaultRewardBreakdown,
        treasuryFee
      );
    });

    it("should be able to show correct ticket number", async function () {
      const tickets = [12345];

      // const reverse = await lottery._reverseTicketNumber(tickets[0]);
      // expect(reverse).to.equal(15432);
    });

    it("should be able to buy 10 tickets", async function () {
      await expect(lottery.buyTickets(tenTicketsArray))
        .to.emit(lottery, "TicketsPurchased")
        .withArgs(dev_account.address, 1, 10, toWei("81.707280688754689024"));

      await expect(lottery.connect(user1).buyTickets(tenTicketsArray))
        .to.emit(lottery, "TicketsPurchased")
        .withArgs(user1.address, 1, 10, toWei("81.707280688754689024"));
    });

    it("should not be able to buy 11 tickets", async function () {
      await expect(lottery.buyTickets(elevenTicketsArray)).to.be.revertedWith(
        "Too many tickets"
      );

      await expect(
        lottery.connect(user1).buyTickets(elevenTicketsArray)
      ).to.be.revertedWith("Too many tickets");
    });

    it("should be able to buy 11 tickets after changes", async function () {
      await lottery.setMaxNumberTicketsEachTime(11);

      await expect(lottery.buyTickets(elevenTicketsArray))
        .to.emit(lottery, "TicketsPurchased")
        .withArgs(dev_account.address, 1, 11, toWei("88.080448582477554767"));

      await expect(lottery.connect(user1).buyTickets(elevenTicketsArray))
        .to.emit(lottery, "TicketsPurchased")
        .withArgs(user1.address, 1, 11, toWei("88.080448582477554767"));
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
    const roundLength = 60 * 60 * 24 * 7; // 1 week

    beforeEach(async function () {
      now = await getLatestBlockTimestamp(ethers.provider);

      await lottery.startLottery(
        now + roundLength,
        toWei("10"),
        defaultRewardBreakdown,
        0
      );

      const lotteryId = await lottery.currentLotteryId();
      await lottery.closeLottery(lotteryId);
    });
    it("should not be able to buy tickets if lottery is closed", async function () {
      await expect(lottery.buyTickets([11111])).to.be.revertedWith(
        "Round not open"
      );
    });
  });

  describe("lottery with claimable status", function () {
    let now: number;
    const roundLength = 60 * 60 * 24 * 7; // 1 week

    let finalNumber: number;

    //tenTicketsArray = [
    //  11115, 11145, 11345, 12345, 13452, 12453, 15423, 15234, 19999, 11111,
    //];

    beforeEach(async function () {
      now = await getLatestBlockTimestamp(ethers.provider);

      await lottery.startLottery(
        now + roundLength,
        toWei("10"),
        defaultRewardBreakdown,
        treasuryFee
      );
      await lottery.buyTickets(tenTicketsArray);

      const lotteryId = await lottery.currentLotteryId();

      await lottery.setTreasury(dev_account.address);
      await lottery.closeLottery(lotteryId);

      //
      await lottery.drawFinalNumberAndMakeLotteryClaimable(lotteryId, true);

      // Total prize pool: 10 x 10 = 100 deg * discount
      // Final number: 12345
      // Prize for brackets: [8, 16, 24, 32]
      // Winner for brackets: [1, 1,1, 1]
      // Winner Id: [11115 (1), 11145 (2), 11345 (3), 12345(4)]

      const lotteryInfo = await lottery.lotteries(lotteryId);
      finalNumber = lotteryInfo.finalNumber;
    });

    it("should be able to reset random generator address", async function () {
      await expect(lottery.changeRandomGenerator(rng.address))
        .to.emit(lottery, "NewRandomGenerator")
        .withArgs(rng.address);
    });

    it("should not be able to buy tickets if lottery is claimable", async function () {
      await expect(lottery.buyTickets([11111])).to.be.revertedWith(
        "Round not open"
      );
    });

    it("should be able to check reward status after claimbale", async function () {
      const rewardPerTicketInBracket =
        await lottery.viewRewardPerTicketInBracket(
          await lottery.currentLotteryId()
        );

      const lotteryInfo = await lottery.lotteries(
        await lottery.currentLotteryId()
      );

      // Total prize pool
      const totalPrize = lotteryInfo.amountCollected;

      // Prize pool for bracket 1
      const prizeForBracket1 = totalPrize.mul(8).div(100);

      expect(rewardPerTicketInBracket[0]).to.equal(prizeForBracket1);
    });

    it("should be able to check user rewards", async function () {
      const userReward = await lottery.viewUserRewards(
        dev_account.address,
        1,
        1
      );
      const lotteryInfo = await lottery.lotteries(
        await lottery.currentLotteryId()
      );

      // Total prize pool
      const totalPrize = lotteryInfo.amountCollected;

      const totalUserPrize = totalPrize.mul(80).div(100);

      expect(userReward[0].mod(10 ** 8)).to.equal(totalUserPrize.mod(10 ** 8));
    });

    it("should get reward equivalent to one correct number in right order", async function () {
      const lotteryInfo = await lottery.lotteries(
        await lottery.currentLotteryId()
      );

      // Total prize pool
      const totalPrize = lotteryInfo.amountCollected;

      // Prize pool for bracket 1
      const prizeForBracket1 = totalPrize.mul(8).div(100);

      // Get the prize for this ticket by view function
      const prize = await lottery.viewRewardsForTicketId(1, 1);

      expect(prize).to.equal(prizeForBracket1);

      // Four winners for bracket 1
      // Each ticket prize: prizeForBracket1 / 4
      await expect(lottery.claimTickets(1, [1], [0]))
        .to.emit(lottery, "TicketsClaim")
        .withArgs(dev_account.address, prizeForBracket1, 1);

      //6536582455100375121
      //1634145613775093780
    });

    it("it should get reward equivalent to two correct numbers in right order", async function () {
      const lotteryInfo = await lottery.lotteries(
        await lottery.currentLotteryId()
      );

      // Total prize pool
      const totalPrize = lotteryInfo.amountCollected;

      // Prize pool for bracket 2
      const prizeForBracket2 = totalPrize.mul(16).div(100);

      await expect(lottery.claimTickets(1, [2], [1]))
        .to.emit(lottery, "TicketsClaim")
        .withArgs(dev_account.address, prizeForBracket2, 1);
    });

    it("it should get reward equivalent to three correct numbers in right order", async function () {
      await expect(lottery.claimTickets(1, [3], [2])).to.emit(
        lottery,
        "TicketsClaim"
      );
    });

    it("it should get reward equivalent to four correct numbers in right order", async function () {
      await expect(lottery.claimTickets(1, [4], [3]))
        .to.emit(lottery, "TicketsClaim")
        .withArgs(dev_account.address, toWei("26.146329820401500487"), 1);
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
      await expect(lottery.claimTickets(1, [20], [0])).to.be.revertedWith(
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

    it("should view lottery info", async function () {
      const lotteryId = await lottery.currentLotteryId();
      const lotteryInfo = await lottery.lotteries(lotteryId);

      expect(lotteryInfo.finalNumber).to.equal(finalNumber);
    });

    it("should view user tickets", async function () {
      const lotteryId = await lottery.currentLotteryId();
      const ticketIds = await lottery.viewWalletTicketIds(
        dev_account.address,
        lotteryId
      );
      const ticketNumbers = await lottery.viewNumbersPerTicketId(ticketIds);

      expect(ticketNumbers).to.deep.equal(tenTicketsArray);
    });

    it("should view a single lottery information", async function () {
      const lotteryInfo = await lottery.viewAllLottery(1, 1);
      expect(lotteryInfo[0].status).to.equal(3);
    });
  });

  describe("past lotteries", async function () {
    let now: number;
    let oldLotteryId: BigNumber, lotteryId: BigNumber;

    beforeEach(async function () {
      now = getNow();

      await lottery.startLottery(
        60 * 60 * 24 * 3 + now,
        toWei("10"),
        defaultRewardBreakdown,
        0
      );
      await lottery.buyTickets(tenTicketsArray);
      oldLotteryId = await lottery.currentLotteryId();
      await lottery.setTreasury(dev_account.address);
      await lottery.closeLottery(oldLotteryId);
      await lottery.drawFinalNumberAndMakeLotteryClaimable(oldLotteryId, true);

      // claim only half of winning tickets
      await lottery.claimTickets(1, [3, 4], [2, 3]);
      await lottery.startLottery(
        60 * 60 * 24 * 3 + now,
        toWei("10"),
        defaultRewardBreakdown,
        0
      );
      lotteryId = await lottery.currentLotteryId();
      await lottery.buyTickets([14690]);
      await lottery.closeLottery(lotteryId);
      await lottery.drawFinalNumberAndMakeLotteryClaimable(lotteryId, true);
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

    it("should not be able to claim already claimed previous tickets as not owner", async function () {
      await expect(
        lottery.connect(user1).claimTickets(1, [1, 2], [0, 1])
      ).to.be.revertedWith("Not the ticket owner or already claimed");
    });

    it("should be able to claim previous tickets despite current lottery fully claimed", async function () {
      await expect(lottery.claimAllTickets(2))
        .to.emit(lottery, "TicketsClaim")
        .withArgs(dev_account.address, toWei("8.365265964080300097"), 2);
      await expect(lottery.claimTickets(1, [1, 2], [0, 1])).to.emit(
        lottery,
        "TicketsClaim"
      );
    });

    it("should view two lotteries information", async function () {
      const lotteryInfo = await lottery.viewAllLottery(1, 2);
      // console.log("lotteryInfo", lotteryInfo, "ends here");
      expect(lotteryInfo[0].status).to.equal(3);
      expect(lotteryInfo[1].status).to.equal(3);
    });

    it("should view different ticket ids spanning multiple lotteries", async function () {
      const oldTicketIds = await lottery.viewWalletTicketIds(
        dev_account.address,
        oldLotteryId
      );
      const ticketIds = await lottery.viewWalletTicketIds(
        dev_account.address,
        lotteryId
      );

      console.log("ticket ids", oldLotteryId, lotteryId);

      expect(oldTicketIds).to.deep.equal([
        BigNumber.from(1),
        BigNumber.from(2),
        BigNumber.from(3),
        BigNumber.from(4),
        BigNumber.from(5),
        BigNumber.from(6),
        BigNumber.from(7),
        BigNumber.from(8),
        BigNumber.from(9),
        BigNumber.from(10),
      ]);
      expect(ticketIds).to.deep.equal([BigNumber.from(11)]);
    });

    it("should have initial and final ticket IDs", async function () {
      const oldLotteryInfo = await lottery.lotteries(oldLotteryId);
      const lotteryInfo = await lottery.lotteries(lotteryId);
      console.log(oldLotteryInfo.firstTicketId);
      console.log(oldLotteryInfo.firstTicketIdNextRound);
      console.log(lotteryInfo.firstTicketId);
      console.log(lotteryInfo.firstTicketIdNextRound);
      expect(oldLotteryInfo.firstTicketId).to.equal(1);
      expect(oldLotteryInfo.firstTicketIdNextRound).to.equal(11);
      expect(lotteryInfo.firstTicketId).to.equal(11);
      expect(lotteryInfo.firstTicketIdNextRound).to.equal(12);
    });
  });
});
