import { expect } from "chai";
import { ethers } from "hardhat";
import {
  DegisToken,
  DegisToken__factory,
  FarmingPool,
  FarmingPool__factory,
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

describe("Farming Pool", function () {
  let FarmingPool: FarmingPool__factory, pool: FarmingPool;
  let DegisToken: DegisToken__factory, degis: DegisToken;
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

    DegisToken = await ethers.getContractFactory("DegisToken");
    degis = await DegisToken.deploy();

    FarmingPool = await ethers.getContractFactory("FarmingPool");
    pool = await FarmingPool.deploy(degis.address);
    await pool.deployed();

    VeDEGToken = await ethers.getContractFactory("VoteEscrowedDegis");
    veDEG = await VeDEGToken.deploy();
    await veDEG.deployed();
    // Initialize veDEG
    await veDEG.initialize(degis.address, pool.address);

    // Add minter role for farming pool contract
    await degis.addMinter(pool.address);

    // Set veDEG address in farming
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
    beforeEach(async function () {
      await degis.mintDegis(dev_account.address, toWei("1000"));
      await degis.approve(veDEG.address, toWei("1000"));
    });
    it("should be able to deposit DEG tokens", async function () {
      await expect(veDEG.deposit(toWei("100")))
        .to.emit(veDEG, "Deposit")
        .withArgs(dev_account.address, toWei("100"));

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

      expect(await veDEG.balanceOf(dev_account.address)).to.equal(0);
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
