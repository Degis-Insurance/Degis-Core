import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
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
  VRFCoordinatorMock,
  VRFCoordinatorMock__factory,
} from "../../typechain";

describe("Degis Lottery", function () {
  let DegisLottery: DegisLottery__factory, lottery: DegisLottery;
  let RandomNumberGenerator: RandomNumberGenerator__factory,
    rand: RandomNumberGenerator;
  let DegisToken: DegisToken__factory, degis: DegisToken;
  let MockUSD: MockUSD__factory, usd: MockUSD;
  let VRFCoordinatorMock: VRFCoordinatorMock__factory,
    mockVRF: VRFCoordinatorMock;

  let dev_account: SignerWithAddress, user1: SignerWithAddress;

  beforeEach(async function () {
    [dev_account, user1] = await ethers.getSigners();

    DegisToken = await ethers.getContractFactory("DegisToken");
    degis = await DegisToken.deploy();

    MockUSD = await ethers.getContractFactory("MockUSD");
    usd = await MockUSD.deploy();

    VRFCoordinatorMock = await ethers.getContractFactory("VRFCoordinatorMock");
    mockVRF = await VRFCoordinatorMock.deploy(usd.address);

    RandomNumberGenerator = await ethers.getContractFactory(
      "RandomNumberGenerator"
    );

    const link_mainnet = "0x514910771AF9Ca656af840dff83E8264EcF986CA";
    const vrf_mainnet = "0xf0d54349aDdcf704F77AE15b96510dEA15cb7952";
    const keyhash_mainnet =
      "0xAA77729D3466CA35AE8D28B3BBAC7CC36A5031EFDC430821C02BC31A238AF445";
    // Mock chainlink vrf
    rand = await RandomNumberGenerator.deploy(
      vrf_mainnet,
      link_mainnet,
      keyhash_mainnet
    );

    DegisLottery = await ethers.getContractFactory("DegisLottery");
    lottery = await DegisLottery.deploy(
      degis.address,
      usd.address,
      rand.address
    );

    await rand.setLotteryAddress(lottery.address);

    await degis.mintDegis(dev_account.address, parseUnits("10000"));
    await degis.approve(lottery.address, parseUnits("10000"));
  });

  describe("Deployment", function () {
    it("should have the correct owner", async function () {
      expect(await lottery.owner()).to.equal(dev_account.address);
    });

    it("should have the correct round weight at first", async function () {
      expect(await lottery.getCurrentRoundWeight()).to.equal(2000000);
    });
  });

  describe("Owner Functions", function () {
    it("should be able to set an operator", async function () {
      await expect(lottery.setOperatorAddress(user1.address))
        .to.emit(lottery, "OperatorAddressChanged")
        .withArgs(user1.address);
    });
  });

  describe("Main Functions", function () {
    let time: number, now: number;

    beforeEach(async function () {
      time = new Date().getTime();
      now = Math.floor(time / 1000);
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
    let time: number, now: number;
    let currentLotteryId: number;
    beforeEach(async function () {
      time = new Date().getTime();
      now = Math.floor(time / 1000);

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

      console.log("user ticket numbers:", userTicketInfo[0]);
      console.log("user ticket amounts:", userTicketInfo[1]);
      console.log("user ticket weights:", userTicketInfo[2]);
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
      console.log("user ticket numbers:", userTicketInfo[0]);
    });

    it("should be able to inject funds", async function () {
      await usd.approve(lottery.address, parseUnits("1000"));
      await lottery.injectFunds(parseUnits("100"));

      const lotteryInfo = await lottery.lotteries(currentLotteryId);
      expect(lotteryInfo.injectedRewards).to.equal(parseUnits("100"));
    });

    it("should be able to stop a lottery", async function () {
      await expect(lottery.closeLottery())
        .to.emit(lottery, "LotteryClose")
        .withArgs(currentLotteryId);
    });
  });
});
