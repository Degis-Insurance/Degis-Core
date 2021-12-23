import { expect } from "chai";
import { ethers } from "hardhat";
import {
  DegisToken,
  DegisToken__factory,
  FarmingPool,
  FarmingPool__factory,
  MockUSD,
  MockUSD__factory,
} from "../../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { parseUnits } from "ethers/lib/utils";
import { BigNumber } from "ethers";

describe("Farming Pool", function () {
  let FarmingPool: FarmingPool__factory, pool: FarmingPool;
  let DegisToken: DegisToken__factory, degis: DegisToken;
  let MockUSD: MockUSD__factory, usd: MockUSD, usd_2: MockUSD;

  let dev_account: SignerWithAddress, user1: SignerWithAddress;

  beforeEach(async function () {
    [dev_account, user1] = await ethers.getSigners();

    DegisToken = await ethers.getContractFactory("DegisToken");
    degis = await DegisToken.deploy();

    FarmingPool = await ethers.getContractFactory("FarmingPool");
    pool = await FarmingPool.deploy(degis.address);

    MockUSD = await ethers.getContractFactory("MockUSD");
    usd = await MockUSD.deploy();
    usd_2 = await MockUSD.deploy();

    await pool.deployed();

    await degis.addMinter(pool.address);
  });

  describe("Deployment", function () {
    it("should have the correct owner", async function () {
      expect(await pool.owner()).to.equal(dev_account.address);
    });

    it("should have the first pool with ID:0", async function () {
      const defaultPool = await pool.poolList(0);
      expect(defaultPool.lpToken).to.equal(ethers.constants.AddressZero);
      expect(defaultPool.degisPerBlock).to.equal(0);
      expect(defaultPool.lastRewardBlock).to.equal(0);
      expect(defaultPool.accDegisPerShare).to.equal(0);
    });
  });

  describe("Owner Functions", function () {
    it("should be able to set the start block", async function () {
      await expect(pool.setStartBlock(60000))
        .to.emit(pool, "StartBlockChanged")
        .withArgs(60000);
    });

    it("should be able to add new pools", async function () {
      await expect(pool.add(usd.address, parseUnits("5"), false))
        .to.emit(pool, "NewPoolAdded")
        .withArgs(usd.address, parseUnits("5"));

      await expect(pool.add(usd_2.address, parseUnits("5"), false))
        .to.emit(pool, "NewPoolAdded")
        .withArgs(usd_2.address, parseUnits("5"));

      const nextPoolId = await pool._nextPoolId();
      expect(await pool.poolMapping(usd.address)).to.equal(nextPoolId.sub(2));
      expect(await pool.poolMapping(usd_2.address)).to.equal(nextPoolId.sub(1));
    });

    it("should not be able to add two same pools", async function () {
      await pool.add(usd.address, parseUnits("5"), false);

      await expect(
        pool.add(usd.address, parseUnits("5"), false)
      ).to.be.revertedWith("This lptoken is already in the farming pool");
    });

    it("should be able to stop a existing pool", async function () {
      await pool.add(usd.address, parseUnits("5"), false);

      const poolId = await pool.poolMapping(usd.address);

      const blockNumBefore = await ethers.provider.getBlockNumber();

      await expect(pool.setDegisReward(poolId, 0, false))
        .to.emit(pool, "FarmingPoolStopped")
        .withArgs(poolId, blockNumBefore + 1);
    });
  });

  describe("User Functions: Deposit, Redeem and Harvest", function () {
    beforeEach(async function () {
      await pool.add(usd.address, parseUnits("5"), false);
    });

    it("should be able to deposit lptokens", async function () {
      await usd.approve(pool.address, parseUnits("1000"));
      await expect(pool.stake(1, parseUnits("100")))
        .to.emit(pool, "Stake")
        .withArgs(dev_account.address, 1, parseUnits("100"));
    });

    it("should be able to get correct farming rewards", async function () {
      await usd.approve(pool.address, parseUnits("1000"));
      await pool.stake(1, parseUnits("100"));

      await mineBlocks(5);

      expect(await pool.pendingDegis(1, dev_account.address)).to.equal(
        parseUnits("25")
      );
    });

    it("should be able to get correct rewards when withdraw", async function () {
      await usd.approve(pool.address, parseUnits("1000"));
      await pool.stake(1, parseUnits("100"));

      await expect(pool.withdraw(1, parseUnits("50")))
        .to.emit(pool, "Withdraw")
        .withArgs(dev_account.address, 1, parseUnits("50"));

      expect(await degis.balanceOf(dev_account.address)).to.equal(
        parseUnits("5")
      );
    });

    it("should be able to get correct rewards when second deposit", async function () {
      await usd.approve(pool.address, parseUnits("1000"));
      await pool.stake(1, parseUnits("100"));

      await expect(pool.stake(1, parseUnits("50")))
        .to.emit(pool, "Stake")
        .withArgs(dev_account.address, 1, parseUnits("50"));

      expect(await degis.balanceOf(dev_account.address)).to.equal(
        parseUnits("5")
      );
    });

    it("should be able to get correct rewards when harvest for self", async function () {
      await usd.approve(pool.address, parseUnits("1000"));
      await pool.stake(1, parseUnits("100"));

      await mineBlocks(5);

      expect(await pool.harvest(1, dev_account.address))
        .to.emit(pool, "Harvest")
        .withArgs(
          dev_account.address,
          dev_account.address,
          1,
          parseUnits("30")
        );
      expect(await degis.balanceOf(dev_account.address)).to.equal(
        parseUnits("30")
      );
    });

    it("should be able to get correct rewards when harvest for another account", async function () {
      await usd.approve(pool.address, parseUnits("1000"));
      await pool.stake(1, parseUnits("100"));

      await mineBlocks(5);

      expect(await pool.harvest(1, user1.address))
        .to.emit(pool, "Harvest")
        .withArgs(dev_account.address, user1.address, 1, parseUnits("30"));

      expect(await degis.balanceOf(user1.address)).to.equal(parseUnits("30"));
    });
  });

  describe("Pool Update", function () {
    it("should be able to update the pools when add a new pool", async function () {
      await pool.add(usd.address, parseUnits("5"), false);

      await expect(pool.add(usd_2.address, parseUnits("5"), true))
        .to.emit(pool, "NewPoolAdded")
        .withArgs(usd_2.address, parseUnits("5"));
    });

    it("should be able to update the pools when stop a pool", async function () {
      await pool.add(usd.address, parseUnits("5"), false);
      await pool.add(usd_2.address, parseUnits("5"), true);

      await mineBlocks(5);
      const blockNumBefore = await ethers.provider.getBlockNumber();

      await expect(pool.setDegisReward(1, 0, true))
        .to.emit(pool, "FarmingPoolStopped")
        .withArgs(1, blockNumBefore + 1);
    });

    it("should be able to manually mass update the pools", async function () {
      await pool.massUpdatePools();
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
