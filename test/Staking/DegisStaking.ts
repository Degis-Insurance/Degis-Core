import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { getContractAddress } from "ethers/lib/utils";
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

import { getLatestBlockNumber, getLatestBlockTimestamp, toWei } from "../utils";

describe("Degis Staking", function () {
  let StakingPoolFactory: StakingPoolFactory__factory,
    factory: StakingPoolFactory;
  let DegisToken: DegisToken__factory, degis: DegisToken;
  let MockERC20: MockERC20__factory, poolToken: MockERC20;
  let CoreStakingPool: CoreStakingPool__factory, pool: CoreStakingPool;

  let dev_account: SignerWithAddress, testAddress: SignerWithAddress;

  beforeEach(async function () {
    [dev_account, testAddress] = await ethers.getSigners();

    CoreStakingPool = await ethers.getContractFactory("CoreStakingPool");

    DegisToken = await ethers.getContractFactory("DegisToken");
    degis = await DegisToken.deploy();

    MockERC20 = await ethers.getContractFactory("MockERC20");
    poolToken = await MockERC20.deploy();

    StakingPoolFactory = await ethers.getContractFactory("StakingPoolFactory");
    factory = await StakingPoolFactory.deploy(degis.address);

    await degis.addMinter(factory.address);

    await factory.deployed();
  });

  describe("Factory functions", function () {
    it("should have the correct owner", async function () {
      expect(await factory.owner()).to.equal(dev_account.address);
    });

    it("should be able to create a new pool", async function () {
      const blockNumber = await ethers.provider.getBlockNumber();

      await expect(
        factory.createPool(poolToken.address, blockNumber, toWei("1"), false)
      ).to.emit(factory, "PoolRegistered");

      // Get pool address outside the factory
      const contractAddress = getContractAddress({
        from: factory.address,
        nonce: 1,
      });

      expect(await factory.getPoolAddress(poolToken.address)).to.equal(
        contractAddress
      );
    });

    it("should not be able to create two pools with the same pool token", async function () {
      const blockNumber = await ethers.provider.getBlockNumber();

      await expect(
        factory.createPool(poolToken.address, blockNumber, toWei("1"), false)
      ).to.emit(factory, "PoolRegistered");

      await expect(
        factory.createPool(poolToken.address, blockNumber, toWei("1"), false)
      ).to.be.revertedWith("This pool is already registered");
    });

    it("should be able to check the pool's information", async function () {
      const blockNumber = await ethers.provider.getBlockNumber();

      await factory.createPool(
        poolToken.address,
        blockNumber,
        toWei("1"),
        false
      );

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
      expect(poolInfo.startBlock).to.equal(blockNumber);
      expect(poolInfo.degisPerBlock).to.equal(toWei("1"));
      expect(poolInfo.isFlashPool).to.equal(false);
    });
  });

  describe("Pool Functions", async function () {
    let poolAddress: string;
    let blockNumber: number;
    let now: number;

    beforeEach(async function () {
      now = await getLatestBlockTimestamp(ethers.provider);
      blockNumber = await getLatestBlockNumber(ethers.provider);

      await factory.createPool(
        poolToken.address,
        blockNumber,
        toWei("1"),
        false
      );

      poolAddress = await factory.getPoolAddress(poolToken.address);

      pool = CoreStakingPool.attach(poolAddress);

      await poolToken.mint(dev_account.address, toWei("100000"));
      await poolToken.approve(poolAddress, toWei("1000"));

      await setNextBlockTime(now + 60);
    });

    it("should be able to stake pool tokens and check the user status", async function () {
      await expect(pool.stake(toWei("100"), now + 6000))
        .to.emit(pool, "Stake")
        .withArgs(dev_account.address, toWei("100"), now + 6000);

      const blockTimestamp = await getLatestBlockTimestamp(ethers.provider);

      const userInfo = await pool.users(dev_account.address);

      expect(userInfo.tokenAmount).to.equal(toWei("100"));
      expect(userInfo.totalWeight).to.equal(toWei("100000000"));
      expect(userInfo.rewardDebts).to.equal(0);

      const userDeposits = await pool.getUserDeposits(dev_account.address);
      expect(userDeposits[0].tokenAmount).to.equal(toWei("100"));
      expect(userDeposits[0].weight).to.equal(toWei("100000000"));
      expect(userDeposits[0].lockedFrom).to.equal(blockTimestamp);
      expect(userDeposits[0].lockedUntil).to.equal(now + 6000);
    });

    it("should not be able to stake tokens before the pool starts", async function () {
      await factory.createPool(
        testAddress.address,
        blockNumber + 200,
        toWei("1"),
        false
      );

      const testpoolAddress = await factory.getPoolAddress(testAddress.address);

      const testpool = CoreStakingPool.attach(testpoolAddress);

      await expect(testpool.stake(toWei("100"), now + 6000)).to.be.revertedWith(
        "Pool not started yet"
      );
      await expect(testpool.stake(toWei("100"), 0)).to.be.revertedWith(
        "Pool not started yet"
      );
    });

    it("should be able to stake pool tokens and harvest reward", async function () {
      const blocknum = 5;

      await expect(pool.stake(toWei("100"), now + 6000))
        .to.emit(pool, "Stake")
        .withArgs(dev_account.address, toWei("100"), now + 6000);

      await mineBlocks(blocknum);

      await pool.harvest();
      expect(await degis.balanceOf(dev_account.address)).to.equal(
        toWei((blocknum + 1).toString())
      );
    });

    it("should be able to withdraw pool tokens and get reward", async function () {
      await pool.stake(toWei("100"), now + 6000);

      await setNextBlockTime(now + 6000);

      await pool.unstake(0, toWei("10"));

      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("1"));
      expect(await poolToken.balanceOf(dev_account.address)).to.equal(
        toWei("99910")
      );
    });

    it("should be able to stake for flexible", async function () {
      await expect(pool.stake(toWei("100"), 0))
        .to.emit(pool, "Stake")
        .withArgs(dev_account.address, toWei("100"), 0);
    });

    it("should be able to able to stake multiple times and withdraw one", async function () {
      await pool.stake(toWei("100"), now + 60000);

      await pool.stake(toWei("200"), 0);

      await expect(pool.unstake(1, toWei("100")))
        .to.emit(pool, "Unstake")
        .withArgs(dev_account.address, toWei("100"));

      expect(await poolToken.balanceOf(dev_account.address)).to.equal(
        toWei("99800")
      );
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
