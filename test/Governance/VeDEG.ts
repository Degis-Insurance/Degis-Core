import { expect } from "chai";
import { ethers } from "hardhat";
import {
  DegisToken,
  DegisToken__factory,
  FarmingPool,
  FarmingPoolUpgradeable,
  FarmingPoolUpgradeable__factory,
  FarmingPool__factory,
  MockUSD,
  MockUSD__factory,
  VoteEscrowedDegis,
  VoteEscrowedDegis__factory,
} from "../../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  getLatestBlockTimestamp,
  stablecoinToWei,
  toWei,
  zeroAddress,
} from "../utils";
import { BigNumberish } from "ethers";
import { formatEther, parseUnits } from "ethers/lib/utils";

describe("Vote Escrowed Degis", function () {
  let FarmingPool: FarmingPoolUpgradeable__factory,
    pool: FarmingPoolUpgradeable;
  let DegisToken: DegisToken__factory, degis: DegisToken;
  let MockUSD: MockUSD__factory, usd: MockUSD;
  let VeDEGToken: VoteEscrowedDegis__factory, veDEG: VoteEscrowedDegis;

  let dev_account: SignerWithAddress, user1: SignerWithAddress;

  // Pool info type definition
  type PoolInfo = {
    lpToken: string;
    basicDegisPerSecond: BigNumberish;
    bonusDegisPerSecond: BigNumberish;
    lastRewardTimestamp: BigNumberish;
    accDegisPerShare: BigNumberish;
    accDegisPerBonusShare: BigNumberish;
    totalBonus: BigNumberish;
  };

  beforeEach(async function () {
    [dev_account, user1] = await ethers.getSigners();

    MockUSD = await ethers.getContractFactory("MockUSD");
    usd = await MockUSD.deploy();

    DegisToken = await ethers.getContractFactory("DegisToken");
    degis = await DegisToken.deploy();

    FarmingPool = await ethers.getContractFactory("FarmingPoolUpgradeable");
    pool = await FarmingPool.deploy();
    await pool.deployed();
    await pool.initialize(degis.address);

    VeDEGToken = await ethers.getContractFactory("VoteEscrowedDegis");
    veDEG = await VeDEGToken.deploy();
    await veDEG.deployed();
    // Initialize veDEG
    await veDEG.initialize(degis.address, pool.address);

    // Add minter role for farming pool contract
    await degis.addMinter(pool.address);

    // Set veDEG address in farming pool
    await pool.setVeDEG(veDEG.address);
  });

  describe("Deployment", function () {
    it("should have the correct owner", async function () {
      expect(await veDEG.owner()).to.equal(dev_account.address);
    });
    it("should have the correct generation rate", async function () {
      expect(await veDEG.generationRate()).to.equal(toWei("1"));
    });

    it("should have the correct mat cap ratio", async function () {
      expect(await veDEG.maxCapRatio()).to.equal(100);
    });
  });

  describe("Owner Functions", function () {
    it("should be able to change the generation rate", async function () {
      await expect(veDEG.setGenerationRate(toWei("2")))
        .to.emit(veDEG, "GenerationRateChanged")
        .withArgs(toWei("1"), toWei("2"));
    });
    it("should be able to change the max cap ratio", async function () {
      await expect(veDEG.setMaxCapRatio(50))
        .to.emit(veDEG, "MaxCapRatioChanged")
        .withArgs(100, 50);
    });
    it("should be able to add and remove whitelist address", async function () {
      await expect(veDEG.addWhitelist(user1.address))
        .to.emit(veDEG, "WhiteListAdded")
        .withArgs(user1.address);

      await expect(veDEG.removeWhitelist(user1.address))
        .to.emit(veDEG, "WhiteListRemoved")
        .withArgs(user1.address);
    });
  });

  describe("Deposit and Claim", function () {
    let lockedStart: number;
    let lockedUntil: number;
    beforeEach(async function () {
      await degis.mintDegis(dev_account.address, toWei("1000"));
      await degis.approve(veDEG.address, toWei("1000"));
    });
    it("should be able to deposit DEG tokens", async function () {
      await expect(veDEG.deposit(toWei("100")))
        .to.emit(veDEG, "Deposit")
        .withArgs(dev_account.address, toWei("100"));

      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("900"));

      const currentTime = await getLatestBlockTimestamp(ethers.provider);

      const userInfo = await veDEG.users(dev_account.address);
      expect(userInfo.amount).to.equal(toWei("100"));
      expect(userInfo.lastRelease).to.equal(currentTime);

      // 10 blocks reward = 10 * 1 * 100 = 1000
      await mineBlocks(10);
      expect(await veDEG.claimable(dev_account.address)).to.equal(
        toWei("1000")
      );

      await mineBlocks(990);
      expect(await veDEG.claimable(dev_account.address)).to.equal(
        toWei("10000")
      );

      await mineBlocks(10);
      expect(await veDEG.claimable(dev_account.address)).to.equal(
        toWei("10000")
      );
    });

    it("should be able to deposit DEG tokens multiple times", async function () {
      await expect(veDEG.deposit(toWei("100")))
        .to.emit(veDEG, "Deposit")
        .withArgs(dev_account.address, toWei("100"));

      await veDEG.deposit(toWei("100"));

      expect(await veDEG.claimable(dev_account.address)).to.equal(0);
      expect(await veDEG.balanceOf(dev_account.address)).to.equal(toWei("100"));
    });

    it("should be able to claim the veDEG reward", async function () {
      await veDEG.deposit(toWei("100"));

      await mineBlocks(9);
      await veDEG.claim();

      expect(await veDEG.balanceOf(dev_account.address)).to.equal(
        toWei("1000")
      );

      await mineBlocks(989);
      await veDEG.claim();
      expect(await veDEG.balanceOf(dev_account.address)).to.equal(
        toWei("10000")
      );

      await mineBlocks(50);
      await veDEG.claim();
      expect(await veDEG.balanceOf(dev_account.address)).to.equal(
        toWei("10000")
      );
    });

    it("should be able to withdraw DEG tokens", async function () {
      await veDEG.deposit(toWei("100"));

      await mineBlocks(10);
      expect(await veDEG.claimable(dev_account.address)).to.equal(
        toWei("1000")
      );

      const currentTime = await getLatestBlockTimestamp(ethers.provider);
      await setNextBlockTime(currentTime + 10);

      await expect(veDEG.withdraw(toWei("100")))
        .to.emit(veDEG, "Withdraw")
        .withArgs(dev_account.address, toWei("100"));

      // veDEG balance should be 0 after withdraw
      expect(await veDEG.balanceOf(dev_account.address)).to.equal(0);

      expect(await degis.balanceOf(dev_account.address)).to.equal(
        toWei("1000")
      );
    });

    it("should be able to stake for max time", async function () {
      await veDEG.depositMaxTime(toWei("100"));

      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("900"));

      const currentTime = await getLatestBlockTimestamp(ethers.provider);

      const userInfo = await veDEG.users(dev_account.address);

      const generationRate = await veDEG.generationRate();
      const maxCapRatio = await veDEG.maxCapRatio();
      const SCALE = await veDEG.SCALE();

      const maxLockTime = maxCapRatio.mul(SCALE).div(generationRate);

      expect(userInfo.amountLocked).to.equal(toWei("100"));
      expect(userInfo.lockUntil).to.equal(
        currentTime + 2 * maxLockTime.toNumber()
      );

      expect(await veDEG.balanceOf(dev_account.address)).to.equal(
        toWei("10000")
      );
    });

    it("should be able to have mixed deposit", async function () {
      await veDEG.deposit(toWei("100"));
      const firstDepositTime = await getLatestBlockTimestamp(ethers.provider);
      await veDEG.depositMaxTime(toWei("100"));
      const secondDepositTime = await getLatestBlockTimestamp(ethers.provider);

      console.log(secondDepositTime - firstDepositTime);

      const generationRate = await veDEG.generationRate();
      const maxCapRatio = await veDEG.maxCapRatio();
      const SCALE = await veDEG.SCALE();

      const maxLockTime = maxCapRatio.mul(SCALE).div(generationRate);

      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("800"));

      const userInfo = await veDEG.users(dev_account.address);
      expect(userInfo.amount).to.equal(toWei("100"));
      expect(userInfo.amountLocked).to.equal(toWei("100"));
      expect(userInfo.lastRelease).to.equal(firstDepositTime);
      expect(userInfo.lockUntil).to.equal(
        firstDepositTime + 1 + 2 * maxLockTime.toNumber()
      );

      expect(await veDEG.balanceOf(dev_account.address)).to.equal(
        toWei("10000")
      );

      // await mineBlocks(2);
      await veDEG.claim();
      expect(await veDEG.balanceOf(dev_account.address)).to.equal(
        toWei("10200")
      );
    });

    it("should be able to only withdraw flexible deposit", async function () {
      await veDEG.deposit(toWei("100"));
      await veDEG.depositMaxTime(toWei("100"));

      expect(await veDEG.balanceOf(dev_account.address)).to.equal(
        toWei("10000")
      );
      expect(await veDEG.claimable(dev_account.address)).to.equal(toWei("100"));

      await veDEG.withdraw(toWei("100"));

      // Still have the locked part
      expect(await veDEG.balanceOf(dev_account.address)).to.equal(
        toWei("10000")
      );
    });

    it("should be able to withdraw locked part", async function () {
      await veDEG.deposit(toWei("100"));
      await veDEG.depositMaxTime(toWei("100"));
      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("800"));

      lockedStart = await getLatestBlockTimestamp(ethers.provider);

      lockedUntil = lockedStart + 200;

      // console.log(lockedUntil);

      await setNextBlockTime(lockedUntil);

      await veDEG.withdrawLocked();

      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("900"));

      // Max amount
      expect(await veDEG.claimable(dev_account.address)).to.equal(
        toWei("10000")
      );

      await veDEG.claim();

      await veDEG.withdraw(toWei("100"));
      expect(await veDEG.balanceOf(dev_account.address)).to.equal(0);
    });
  });

  describe("Work with Farming Pool", function () {
    beforeEach(async function () {
      await usd.approve(pool.address, stablecoinToWei("100"));
      await pool.add(usd.address, toWei("1"), toWei("1"), false);

      await degis.mintDegis(dev_account.address, toWei("1000"));
      await degis.approve(veDEG.address, toWei("1000"));
    });

    it("should be able to get basic rewards when no veDEG staking", async function () {
      await pool.stake(1, stablecoinToWei("10"));

      await mineBlocks(10);
      expect(await pool.pendingDegis(1, dev_account.address)).to.equal(
        toWei("10")
      );
    });

    it("should be able to get bonus reward when have veDEG", async function () {
      // block 0
      await pool.stake(1, stablecoinToWei("10"));
      // block 1
      await veDEG.deposit(toWei("100"));

      await mineBlocks(9);
      // block 10
      expect(await pool.pendingDegis(1, dev_account.address)).to.equal(
        toWei("10")
      );

      await veDEG.claim();
      // block 11
      expect(await veDEG.balanceOf(dev_account.address)).to.equal(
        toWei("1000")
      );
      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("900"));
      expect(await pool.pendingDegis(1, dev_account.address)).to.equal(
        toWei("11")
      );
      expect(await pool.extraClaimable(1, dev_account.address)).to.equal(
        toWei("11")
      );

      await mineBlocks(10);

      // block 21
      expect(await pool.pendingDegis(1, dev_account.address)).to.equal(
        toWei("31")
      );
    });

    it("should be able to reserve bonus when no veDEG", async function () {
      // block 0
      await pool.stake(1, stablecoinToWei("10"));
      // block 1
      await veDEG.deposit(toWei("100"));

      // block 10
      await mineBlocks(9);
      // block 10
      expect(await pool.pendingDegis(1, dev_account.address)).to.equal(
        toWei("10")
      );

      // block 11
      await veDEG.claim();
      expect(await veDEG.balanceOf(dev_account.address)).to.equal(
        toWei("1000")
      );

      expect(await pool.pendingDegis(1, dev_account.address)).to.equal(
        toWei("11")
      );

      // block 15
      await mineBlocks(4);
      expect(await pool.pendingDegis(1, dev_account.address)).to.equal(
        toWei("19")
      );

      // block 16
      await veDEG.withdraw(toWei("100"));

      expect(await veDEG.balanceOf(dev_account.address)).to.equal(0);
      expect(await pool.pendingDegis(1, dev_account.address)).to.equal(
        toWei("21")
      );
      expect(await pool.extraClaimable(1, dev_account.address)).to.equal(
        toWei("21")
      );

      await pool.harvest(1, dev_account.address);
      expect(await degis.balanceOf(dev_account.address)).to.equal(
        toWei("1022")
      );
    });
  });

  describe("Whitelist contract burn veDEG", function () {
    beforeEach(async function () {
      await usd.approve(pool.address, stablecoinToWei("100"));
      await pool.add(usd.address, toWei("1"), toWei("1"), false);

      await degis.mintDegis(dev_account.address, toWei("1000"));
      await degis.approve(veDEG.address, toWei("1000"));

      await veDEG.addWhitelist(user1.address);
    });
    it("should be able to burn veDEG as entrance", async function () {
      await veDEG.deposit(toWei("100"));

      await mineBlocks(100);
      await veDEG.claim();

      expect(await veDEG.balanceOf(dev_account.address)).to.equal(toWei("10000"));

      await veDEG.connect(user1).burnVeDEG(dev_account.address, toWei("100"));

      expect(await veDEG.balanceOf(dev_account.address)).to.equal(toWei("9900"));
    });
  });
});

async function mineBlocks(blockNumber: number) {
  while (blockNumber > 0) {
    blockNumber--;
    await hre.network.provider.request({
      method: "evm_mine",
      params: [],
    });
  }
}

// hre can be used in hardhat environment but not with mocha built-in test
async function setNextBlockTime(time: number) {
  await hre.network.provider.request({
    method: "evm_setNextBlockTimestamp",
    params: [time],
  });
}
