import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { formatEther, getContractAddress } from "ethers/lib/utils";
import { ethers } from "hardhat";
import {
  CoreStakingPool,
  CoreStakingPool__factory,
  DegisToken,
  DegisToken__factory,
  MockERC20,
  MockERC20__factory,
  StakingPoolFactory,
  StakingPoolFactory__factory,
} from "../../typechain";

import { getLatestBlockTimestamp, toWei } from "../utils";

describe("Degis Staking", function () {
  let StakingPoolFactory: StakingPoolFactory__factory,
    factory: StakingPoolFactory;
  let DegisToken: DegisToken__factory, degis: DegisToken;
  let MockERC20: MockERC20__factory, poolToken: MockERC20;
  let CoreStakingPool: CoreStakingPool__factory, pool: CoreStakingPool;

  let dev_account: SignerWithAddress,
    testAddress: SignerWithAddress,
    user1: SignerWithAddress;

  beforeEach(async function () {
    [dev_account, testAddress, user1] = await ethers.getSigners();

    CoreStakingPool = await ethers.getContractFactory("CoreStakingPool");

    DegisToken = await ethers.getContractFactory("DegisToken");
    degis = await DegisToken.deploy();

    MockERC20 = await ethers.getContractFactory("MockERC20");
    poolToken = await MockERC20.deploy();

    StakingPoolFactory = await ethers.getContractFactory("StakingPoolFactory");
    factory = await StakingPoolFactory.deploy(degis.address);

    // Add minter role to factory
    await degis.addMinter(factory.address);

    await factory.deployed();
  });

  describe("Factory functions", function () {
    it("should have the correct owner", async function () {
      expect(await factory.owner()).to.equal(dev_account.address);
    });

    it("should be able to create a new pool", async function () {
      const blockTimestamp = await getLatestBlockTimestamp(ethers.provider);

      // Get pool address outside the factory
      const contractAddress = getContractAddress({
        from: factory.address,
        nonce: 1,
      });

      await expect(
        factory.createPool(poolToken.address, blockTimestamp, toWei("1"))
      )
        .to.emit(factory, "PoolRegistered")
        .withArgs(
          dev_account.address,
          poolToken.address,
          contractAddress,
          toWei("1")
        );

      expect(await factory.getPoolAddress(poolToken.address)).to.equal(
        contractAddress
      );
    });

    it("should not be able to create two pools with the same pool token", async function () {
      const blockTimestamp = await getLatestBlockTimestamp(ethers.provider);

      await expect(
        factory.createPool(poolToken.address, blockTimestamp, toWei("1"))
      ).to.emit(factory, "PoolRegistered");

      await expect(
        factory.createPool(poolToken.address, blockTimestamp, toWei("1"))
      ).to.be.revertedWith("This pool is already registered");

      await expect(
        factory.createPool(poolToken.address, blockTimestamp + 200, toWei("1"))
      ).to.be.revertedWith("This pool is already registered");

      await expect(
        factory.createPool(poolToken.address, blockTimestamp, toWei("2"))
      ).to.be.revertedWith("This pool is already registered");

      await expect(
        factory.createPool(poolToken.address, blockTimestamp + 200, toWei("2"))
      ).to.be.revertedWith("This pool is already registered");
    });

    it("should be able to check the pool's information", async function () {
      const blockTimestamp = await getLatestBlockTimestamp(ethers.provider);

      await factory.createPool(poolToken.address, blockTimestamp, toWei("1"));

      // this should be the lastRewardTimestamp
      const after = await getLatestBlockTimestamp(ethers.provider);

      // Get pool address outside the factory
      const contractAddress = getContractAddress({
        from: factory.address,
        nonce: 1,
      });

      expect(await factory.getPoolAddress(poolToken.address)).to.equal(
        contractAddress
      );

      const poolInfo = await factory.getPoolData(poolToken.address);
      expect(poolInfo.poolAddress).to.equal(contractAddress);
      expect(poolInfo.poolToken).to.equal(poolToken.address);
      expect(poolInfo.startTimestamp).to.equal(blockTimestamp);
      expect(poolInfo.degisPerSecond).to.equal(toWei("1"));

      const pool = CoreStakingPool.attach(contractAddress);
      expect(await pool.lastRewardTimestamp()).to.equal(after);
    });

    it("should be able to change the degis reward speed", async function () {
      const blockTimestamp = await getLatestBlockTimestamp(ethers.provider);
      await factory.createPool(poolToken.address, blockTimestamp, toWei("1"));

      const poolInfo = await factory.getPoolData(poolToken.address);

      await expect(factory.setDegisPerSecond(poolInfo.poolAddress, toWei("2")))
        .to.emit(factory, "DegisPerSecondChanged")
        .withArgs(poolInfo.poolAddress, toWei("2"));

      const poolInfo_update = await factory.getPoolData(poolToken.address);
      expect(poolInfo_update.degisPerSecond).to.equal(toWei("2"));
    });

    it("should not be able to mint reward from EOA", async function () {
      const blockTimestamp = await getLatestBlockTimestamp(ethers.provider);
      await factory.createPool(poolToken.address, blockTimestamp, toWei("1"));
      const poolInfo = await factory.getPoolData(poolToken.address);

      await expect(
        factory.mintReward(poolInfo.poolAddress, toWei("200"))
      ).to.be.revertedWith("Only called from pool");
    });
  });

  describe("Pool Functions", async function () {
    let poolAddress: string;
    let delay: number;
    let startTime: number;
    let maxLockTime: number;

    beforeEach(async function () {
      startTime = await getLatestBlockTimestamp(ethers.provider);

      await factory.createPool(poolToken.address, startTime, toWei("1"));

      // Pool address
      poolAddress = await factory.getPoolAddress(poolToken.address);

      // Pool instance
      pool = CoreStakingPool.attach(poolAddress);

      await poolToken.mint(dev_account.address, toWei("1000"));
      await poolToken.approve(poolAddress, toWei("1000"));

      await poolToken.mint(user1.address, toWei("1000"));
      await poolToken.connect(user1).approve(poolAddress, toWei("1000"));

      maxLockTime = 365 * 86400; // 365 days
    });

    it("should be able to stake pool tokens and check the user status", async function () {
      const time_1 = await getLatestBlockTimestamp(ethers.provider);
      const lockTime = maxLockTime / 2;

      // Fixed time stake
      await expect(pool.stake(toWei("100"), time_1 + lockTime))
        .to.emit(pool, "Stake")
        .withArgs(dev_account.address, toWei("100"), time_1 + lockTime);

      const time_2 = await getLatestBlockTimestamp(ethers.provider);

      const weight = Math.floor(
        ((time_1 + lockTime - time_2) * 1e6) / maxLockTime + 1e6
      );

      const userInfo = await pool.users(dev_account.address);

      expect(userInfo.tokenAmount).to.equal(toWei("100"));
      // fixed stake: weight = locktime * 1e6 / 365 days
      expect(userInfo.totalWeight).to.equal(toWei((weight * 100).toString()));
      expect(userInfo.rewardDebt).to.equal(0);

      const userDeposits = await pool.getUserDeposits(dev_account.address);
      expect(userDeposits[0].tokenAmount).to.equal(toWei("100"));
      // flexible stake: weight = amount * 1e6
      expect(userDeposits[0].weight).to.equal(toWei((weight * 100).toString()));
      expect(userDeposits[0].lockedFrom).to.equal(time_2);
      expect(userDeposits[0].lockedUntil).to.equal(time_1 + lockTime);
    });

    it("should be able to stake for flexible and check the user status", async function () {
      await expect(pool.stake(toWei("100"), 0))
        .to.emit(pool, "Stake")
        .withArgs(dev_account.address, toWei("100"), 0);

      const userInfo = await pool.users(dev_account.address);

      expect(userInfo.tokenAmount).to.equal(toWei("100"));
      expect(userInfo.totalWeight).to.equal(toWei("100000000"));
      expect(userInfo.rewardDebt).to.equal(0);

      const userDeposits = await pool.getUserDeposits(dev_account.address);
      expect(userDeposits[0].tokenAmount).to.equal(toWei("100"));
      expect(userDeposits[0].weight).to.equal(toWei("100000000"));
      // For flexible stake, from and until arre both 0
      expect(userDeposits[0].lockedFrom).to.equal(0);
      expect(userDeposits[0].lockedUntil).to.equal(0);

      await mineBlocks(1);
      expect(await pool.pendingReward(dev_account.address)).to.equal(
        toWei("1")
      );
    });

    it("should be able to stake for 365 days and check the user status", async function () {
      const time_1 = await getLatestBlockTimestamp(ethers.provider);
      const lockTime = maxLockTime + 200;

      await setNextBlockTime(time_1 + 1);

      await expect(pool.stake(toWei("100"), time_1 + lockTime))
        .to.emit(pool, "Stake")
        .withArgs(dev_account.address, toWei("100"), time_1 + 1 + maxLockTime);

      const time_2 = await getLatestBlockTimestamp(ethers.provider);

      const weight = Math.floor(
        ((time_1 + lockTime - time_2) * 1e6) / maxLockTime + 1e6
      );
      console.log("Weight: ", weight);

      const userInfo = await pool.users(dev_account.address);

      expect(userInfo.tokenAmount).to.equal(toWei("100"));
      expect(userInfo.totalWeight).to.equal(toWei("200000000"));
      expect(userInfo.rewardDebt).to.equal(0);

      const userDeposits = await pool.getUserDeposits(dev_account.address);
      expect(userDeposits[0].tokenAmount).to.equal(toWei("100"));
      expect(userDeposits[0].weight).to.equal(toWei("200000000"));
      // For flexible stake, from and until arre both 0
      expect(userDeposits[0].lockedFrom).to.equal(time_2);
      expect(userDeposits[0].lockedUntil).to.equal(time_2 + maxLockTime);

      await mineBlocks(1);
      expect(await pool.pendingReward(dev_account.address)).to.equal(
        toWei("1")
      );
    });

    it("should not be able to stake tokens before the pool starts", async function () {
      // Current timestamp = startTime + delay
      // Start staking timestamp = startTime + 200 > current timestamp
      const currentTime = await getLatestBlockTimestamp(ethers.provider);
      await setNextBlockTime(currentTime + 1);

      await factory.createPool(
        testAddress.address,
        currentTime + 200,
        toWei("1")
      );

      const testpoolAddress = await factory.getPoolAddress(testAddress.address);

      const testpool = CoreStakingPool.attach(testpoolAddress);

      await setNextBlockTime(currentTime + 20);

      await expect(
        testpool.stake(toWei("100"), startTime + 6000)
      ).to.be.revertedWith("Pool not started yet");

      await expect(testpool.stake(toWei("100"), 0)).to.be.revertedWith(
        "Pool not started yet"
      );
    });

    it("should be able to stake pool tokens and harvest reward", async function () {
      await expect(pool.stake(toWei("100"), 0))
        .to.emit(pool, "Stake")
        .withArgs(dev_account.address, toWei("100"), 0);

      const after = await getLatestBlockTimestamp(ethers.provider);

      // Balance before
      const degBalanceBefore = await degis.balanceOf(dev_account.address);

      await pool.harvest();
      const final = await getLatestBlockTimestamp(ethers.provider);

      // Balance after
      const degBalanceAfter = await degis.balanceOf(dev_account.address);

      expect(degBalanceAfter.sub(degBalanceBefore)).to.equal(
        toWei((final - after).toString())
      );
    });

    it("should be able to withdraw pool tokens and get reward", async function () {
      const lockTime = 1000;

      const time1 = await getLatestBlockTimestamp(ethers.provider);
      await setNextBlockTime(time1 + 1);

      await pool.stake(toWei("100"), 0); // Time 1 + 1

      const after = await getLatestBlockTimestamp(ethers.provider);

      const degBalanceBefore = await degis.balanceOf(dev_account.address);

      await setNextBlockTime(time1 + lockTime);

      await pool.unstake(0, toWei("10")); // Time 1 + 1000
      const degBalanceAfter = await degis.balanceOf(dev_account.address);
      const final = await getLatestBlockTimestamp(ethers.provider);

      expect(degBalanceAfter.sub(degBalanceBefore)).to.equal(
        toWei((final - after).toString())
      );
      expect(await poolToken.balanceOf(dev_account.address)).to.equal(
        toWei("910")
      );
    });

    it("should be able to able to stake multiple times and withdraw one", async function () {
      await pool.stake(toWei("100"), startTime + 60000);

      await pool.stake(toWei("200"), 0);

      await expect(pool.unstake(1, toWei("100")))
        .to.emit(pool, "Unstake")
        .withArgs(dev_account.address, toWei("100"));

      expect(await poolToken.balanceOf(dev_account.address)).to.equal(
        toWei("800")
      );

      const user = await pool.users(dev_account.address);
      const userWeight = user.totalWeight;

      const poolWeight = await pool.totalWeight();

      expect(userWeight).to.equal(poolWeight);
    });

    it("should be able to get reward with multiple players(paying staking fee)", async function () {
      const time0 = await getLatestBlockTimestamp(ethers.provider);
      await pool.stake(toWei("200"), 0);

      const time1 = await getLatestBlockTimestamp(ethers.provider);
      await pool.connect(user1).stake(toWei("200"), 0);
      const time2 = await getLatestBlockTimestamp(ethers.provider);

      const fee_1 = 200 * 0.02;

      expect(await pool.pendingReward(dev_account.address)).to.equal(
        toWei((time2 - time1 + fee_1).toString())
      );
      expect(await pool.pendingReward(user1.address)).to.equal(toWei("0"));
    });

    it("should be able to check pending reward", async function () {
      expect(await pool.pendingReward(dev_account.address)).to.equal(0);
    });
  });
});

// hre can be used in hardhat environment but not with mocha built-in test
async function setNextBlockTime(time: number) {
  await hre.network.provider.request({
    method: "evm_setNextBlockTimestamp",
    params: [time],
  });
}

async function mineBlocks(blockNumber: number) {
  while (blockNumber > 0) {
    blockNumber--;
    await hre.network.provider.request({
      method: "evm_mine",
      params: [],
    });
  }
}
