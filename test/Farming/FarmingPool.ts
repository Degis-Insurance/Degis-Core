import { expect } from "chai";
import { ethers } from "hardhat";
import {
  DegisToken,
  DegisToken__factory,
  FarmingPool,
  FarmingPool__factory,
  MockERC20,
  MockERC20__factory,
  MockUSD,
  MockUSD__factory,
} from "../../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  getLatestBlockTimestamp,
  stablecoinToWei,
  toWei,
  zeroAddress,
} from "../utils";
import { BigNumberish } from "ethers";

describe("Farming Pool", function () {
  let FarmingPool: FarmingPool__factory, pool: FarmingPool;
  let DegisToken: DegisToken__factory, degis: DegisToken;
  let MockERC20: MockERC20__factory, lptoken_1: MockERC20, lptoken_2: MockERC20;
  let MockUSD: MockUSD__factory, lptoken_3: MockUSD;

  let dev_account: SignerWithAddress, user1: SignerWithAddress;

  // Pool info type definition
  type PoolInfo = {
    lpToken: string;
    degisPerSecond: BigNumberish;
    lastRewardTimestamp: BigNumberish;
    accDegisPerShare: BigNumberish;
  };

  beforeEach(async function () {
    [dev_account, user1] = await ethers.getSigners();

    DegisToken = await ethers.getContractFactory("DegisToken");
    degis = await DegisToken.deploy();

    FarmingPool = await ethers.getContractFactory("FarmingPool");
    pool = await FarmingPool.deploy(degis.address);
    await pool.deployed();

    MockERC20 = await ethers.getContractFactory("MockERC20");

    // Two lptoken contracts (18 decimals)
    // They will be added as farming pools
    lptoken_1 = await MockERC20.deploy();
    lptoken_2 = await MockERC20.deploy();

    // 6 decimals
    MockUSD = await ethers.getContractFactory("MockUSD");
    lptoken_3 = await MockUSD.deploy();

    // Add minter role for farming pool contract
    await degis.addMinter(pool.address);
  });

  describe("Deployment", function () {
    it("should have the correct owner", async function () {
      expect(await pool.owner()).to.equal(dev_account.address);
    });

    it("should have the correct degis address", async function () {
      expect(await pool.degis()).to.equal(degis.address);
    });

    it("should have the correct next pool id at first", async function () {
      expect(await pool._nextPoolId()).to.equal(1);
    });

    it("should have the first pool with ID:0", async function () {
      const defaultPool: PoolInfo = await pool.poolList(0);

      expect(defaultPool.lpToken).to.equal(zeroAddress());
      expect(defaultPool.degisPerSecond).to.equal(0);
      expect(defaultPool.lastRewardTimestamp).to.equal(0);
      expect(defaultPool.accDegisPerShare).to.equal(0);
    });

    it("should have the correct pausable status", async function () {
      expect(await pool.paused()).to.equal(false);
    });
  });

  describe("Owner Functions", function () {
    it("should be able to set the start block", async function () {
      await expect(pool.setStartTimestamp(60000))
        .to.emit(pool, "StartTimestampChanged")
        .withArgs(60000);
    });

    it("should not be able to set start block after start mining", async function () {
      await pool.add(lptoken_1.address, toWei("5"), false);
      await expect(pool.setStartTimestamp(60000)).to.be.revertedWith(
        "Can not set start timestamp after adding a pool"
      );

      await pool.add(lptoken_2.address, toWei("5"), false);
      await expect(pool.setStartTimestamp(60000)).to.be.revertedWith(
        "Can not set start timestamp after adding a pool"
      );
    });

    it("should be able to pause the contract", async function () {
      await expect(pool.connect(user1).pause()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
      await pool.pause();

      await expect(
        pool.add(lptoken_1.address, toWei("5"), false)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("should be able to unpause the contract", async function () {
      await pool.pause();

      await expect(
        pool.add(lptoken_1.address, toWei("5"), false)
      ).to.be.revertedWith("Pausable: paused");

      await pool.unpause();

      await expect(pool.add(lptoken_1.address, toWei("5"), false)).to.emit(
        pool,
        "NewPoolAdded"
      );
    });

    it("should be able to add new pools", async function () {
      const blockTimestampBefore = await getLatestBlockTimestamp(
        ethers.provider
      );

      await expect(pool.add(lptoken_1.address, toWei("5"), false))
        .to.emit(pool, "NewPoolAdded")
        .withArgs(lptoken_1.address, toWei("5"));

      await expect(pool.add(lptoken_2.address, toWei("5"), false))
        .to.emit(pool, "NewPoolAdded")
        .withArgs(lptoken_2.address, toWei("5"));

      // Have the correct pool id
      const nextPoolId = await pool._nextPoolId();
      expect(await pool.poolMapping(lptoken_1.address)).to.equal(
        nextPoolId.sub(2)
      );
      expect(await pool.poolMapping(lptoken_2.address)).to.equal(
        nextPoolId.sub(1)
      );

      // Have correct pool infos
      const poolList = await pool.getPoolList();

      // Default pool
      const pool_0 = poolList[0];
      expect(pool_0.lpToken).to.equal(zeroAddress());
      expect(pool_0.degisPerSecond).to.equal(0);
      expect(pool_0.lastRewardTimestamp).to.equal(0);
      expect(pool_0.accDegisPerShare).to.equal(0);

      // Pool 1: lptoken_1
      const pool_1 = poolList[1];
      expect(pool_1.lpToken).to.equal(lptoken_1.address);
      expect(pool_1.degisPerSecond).to.equal(toWei("5"));
      expect(pool_1.lastRewardTimestamp).to.equal(blockTimestampBefore + 1);
      expect(pool_1.accDegisPerShare).to.equal(0);

      // Pool 2: lptoken_2
      const pool_2 = poolList[2];
      expect(pool_2.lpToken).to.equal(lptoken_2.address);
      expect(pool_2.degisPerSecond).to.equal(toWei("5"));
      expect(pool_2.lastRewardTimestamp).to.equal(blockTimestampBefore + 2);
      expect(pool_2.accDegisPerShare).to.equal(0);
    });

    it("should not be able to add two same pools", async function () {
      await pool.add(lptoken_1.address, toWei("5"), false);

      await expect(
        pool.add(lptoken_1.address, toWei("5"), false)
      ).to.be.revertedWith("This lptoken is already in the farming pool");
    });

    it("should be able to set degis reward of a pool", async function () {
      await pool.add(lptoken_1.address, toWei("5"), false);
      const poolId = await pool.poolMapping(lptoken_1.address);

      await expect(pool.setDegisReward(poolId, toWei("10"), false))
        .to.emit(pool, "DegisRewardChanged")
        .withArgs(poolId, toWei("10"));

      const poolList = await pool.getPoolList();
      expect(poolList[poolId.toNumber()].degisPerSecond).to.equal(toWei("10"));
    });

    it("should be able to stop a existing pool", async function () {
      await pool.add(lptoken_1.address, toWei("5"), false);

      const poolId = await pool.poolMapping(lptoken_1.address);

      const blockTimestampBefore = await getLatestBlockTimestamp(
        ethers.provider
      );

      await expect(pool.setDegisReward(poolId, 0, false))
        .to.emit(pool, "FarmingPoolStopped")
        .withArgs(poolId, blockTimestampBefore + 1);
    });

    it("should be able to restart a farming pool", async function () {
      await pool.add(lptoken_1.address, toWei("5"), false);
      const poolId = await pool.poolMapping(lptoken_1.address);

      // Stop a pool
      await pool.setDegisReward(poolId, 0, false);

      const blockTimestampBefore = await getLatestBlockTimestamp(
        ethers.provider
      );

      // Restart
      await expect(pool.setDegisReward(poolId, toWei("10"), false))
        .to.emit(pool, "FarmingPoolStarted")
        .withArgs(poolId, blockTimestampBefore + 1);
    });
  });

  describe("User Functions: Deposit, Redeem and Harvest", function () {
    beforeEach(async function () {
      // Add lptoken_1
      // Reward speed: 5 degis per block
      await pool.add(lptoken_1.address, toWei("5"), false);
      // Add lptoken_3
      // Reward speed: 5 degis per block
      await pool.add(lptoken_3.address, toWei("5"), false);
    });

    it("should be able to deposit lptokens", async function () {
      await lptoken_1.mint(dev_account.address, toWei("1000"));
      await lptoken_1.approve(pool.address, toWei("1000"));

      await expect(pool.stake(1, toWei("100")))
        .to.emit(pool, "Stake")
        .withArgs(dev_account.address, 1, toWei("100"));
    });

    it("should be able to deposit lptokens with 6 decimals", async function () {
      await lptoken_3.mint(dev_account.address, stablecoinToWei("1000"));
      await lptoken_3.approve(pool.address, stablecoinToWei("1000"));

      await expect(pool.stake(2, stablecoinToWei("100")))
        .to.emit(pool, "Stake")
        .withArgs(dev_account.address, 2, stablecoinToWei("100"));
    });

    it("should be able to get correct farming rewards", async function () {
      await lptoken_1.mint(dev_account.address, toWei("1000"));
      await lptoken_1.approve(pool.address, toWei("1000"));
      await pool.stake(1, toWei("100"));

      // Mine five blocks
      // BlockNumber += 5
      await mineBlocks(5);

      // 5 blocks reward: 5 * 5 = 25
      expect(await pool.pendingDegis(1, dev_account.address)).to.equal(
        toWei("25")
      );
    });

    it("should be able to get correct farming rewards with 6 decimals", async function () {
      await lptoken_3.mint(dev_account.address, stablecoinToWei("1000"));
      await lptoken_3.approve(pool.address, stablecoinToWei("1000"));
      await pool.stake(2, stablecoinToWei("100"));

      // Mine five blocks
      // BlockNumber += 5
      await mineBlocks(5);

      // 5 blocks reward: 5 * 5 = 25
      expect(await pool.pendingDegis(2, dev_account.address)).to.equal(
        toWei("25")
      );
    });

    it("should be able to get correct rewards when withdraw", async function () {
      await lptoken_1.mint(dev_account.address, toWei("1000"));
      await lptoken_1.approve(pool.address, toWei("1000"));
      await pool.stake(1, toWei("100"));

      await expect(pool.withdraw(1, toWei("50")))
        .to.emit(pool, "Withdraw")
        .withArgs(dev_account.address, 1, toWei("50"));

      // 1 block reward: 5 * 1 = 5
      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("5"));
    });

    it("should be able to get correct rewards when second deposit", async function () {
      await lptoken_1.mint(dev_account.address, toWei("1000"));
      await lptoken_1.approve(pool.address, toWei("1000"));
      await pool.stake(1, toWei("100"));

      await expect(pool.stake(1, toWei("50")))
        .to.emit(pool, "Stake")
        .withArgs(dev_account.address, 1, toWei("50"));

      // 1 block reward: 5 * 1 = 5
      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("5"));
    });

    it("should be able to get correct rewards after another user deposit", async function () {
      await lptoken_1.mint(dev_account.address, toWei("1000"));
      await lptoken_1.approve(pool.address, toWei("1000"));
      await pool.stake(1, toWei("100"));

      await lptoken_1.mint(user1.address, toWei("1000"));
      await lptoken_1.connect(user1).approve(pool.address, toWei("1000"));
      await expect(pool.connect(user1).stake(1, toWei("100")))
        .to.emit(pool, "Stake")
        .withArgs(user1.address, 1, toWei("100"));

      // 3 blocks reward: 5 * 3 = 15
      expect(await pool.pendingDegis(1, dev_account.address)).to.equal(
        toWei("15")
      );
      expect(await pool.pendingDegis(1, user1.address)).to.equal(0);

      await mineBlocks(1);

      expect(await pool.pendingDegis(1, dev_account.address)).to.equal(
        toWei("17.5")
      );
      expect(await pool.pendingDegis(1, user1.address)).to.equal(toWei("2.5"));
    });

    it("should be able to get correct rewards after another user deposit with 6 decimals", async function () {
      await lptoken_3.mint(dev_account.address, stablecoinToWei("1000"));
      await lptoken_3.approve(pool.address, stablecoinToWei("1000"));
      await pool.stake(2, stablecoinToWei("100"));

      await lptoken_3.mint(user1.address, stablecoinToWei("1000"));
      await lptoken_3
        .connect(user1)
        .approve(pool.address, stablecoinToWei("1000"));

      await expect(pool.connect(user1).stake(2, stablecoinToWei("100")))
        .to.emit(pool, "Stake")
        .withArgs(user1.address, 2, stablecoinToWei("100"));

      // 3 blocks reward: 5 * 3 = 15
      expect(await pool.pendingDegis(2, dev_account.address)).to.equal(
        toWei("15")
      );
      expect(await pool.pendingDegis(2, user1.address)).to.equal(0);

      await mineBlocks(1);

      expect(await pool.pendingDegis(2, dev_account.address)).to.equal(
        toWei("17.5")
      );
      expect(await pool.pendingDegis(2, user1.address)).to.equal(toWei("2.5"));
    });

    it("should be able to get correct rewards when harvest for self", async function () {
      await lptoken_1.mint(dev_account.address, toWei("1000"));
      await lptoken_1.approve(pool.address, toWei("1000"));
      await pool.stake(1, toWei("100"));

      // Mine five blocks
      // BlockNumber += 5
      await mineBlocks(5);

      // 6 blocks reward: 5 * 6 = 30
      expect(await pool.harvest(1, dev_account.address))
        .to.emit(pool, "Harvest")
        .withArgs(dev_account.address, dev_account.address, 1, toWei("30"));

      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("30"));
    });

    it("should be able to harvest correct rewards after another user deposit", async function () {
      await lptoken_1.mint(dev_account.address, toWei("1000"));
      await lptoken_1.approve(pool.address, toWei("1000"));
      await pool.stake(1, toWei("100"));

      await lptoken_1.mint(user1.address, toWei("1000"));
      await lptoken_1.connect(user1).approve(pool.address, toWei("1000"));

      await pool.connect(user1).stake(1, toWei("100"));

      // 3 blocks reward: 5 * 3 = 15
      expect(await pool.pendingDegis(1, dev_account.address)).to.equal(
        toWei("15")
      );

      await mineBlocks(1);

      expect(await pool.pendingDegis(1, dev_account.address)).to.equal(
        toWei("17.5")
      );

      // 17.5 + 2.5(1 block reward)
      await pool.harvest(1, dev_account.address);
      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("20"));
    });

    it("should be able to get correct rewards when harvest for another account", async function () {
      await lptoken_1.mint(dev_account.address, toWei("1000"));
      await lptoken_1.approve(pool.address, toWei("1000"));
      await pool.stake(1, toWei("100"));

      // Mine five blocks
      // BlockNumber += 5
      await mineBlocks(5);

      // 6 blocks reward: 5 * 6 = 30
      expect(await pool.harvest(1, user1.address))
        .to.emit(pool, "Harvest")
        .withArgs(dev_account.address, user1.address, 1, toWei("30"));

      expect(await degis.balanceOf(user1.address)).to.equal(toWei("30"));
    });
  });

  describe("Pool Update", function () {
    it("should be able to update the pools when add a new pool", async function () {
      await pool.add(lptoken_1.address, toWei("5"), false);

      await lptoken_1.mint(dev_account.address, toWei("1000"));
      await lptoken_1.approve(pool.address, toWei("1000"));
      await pool.stake(1, toWei("100"));

      await expect(pool.add(lptoken_2.address, toWei("5"), true))
        .to.emit(pool, "PoolUpdated")
        .withArgs(1);
    });

    it("should be able to update the pools when stop a pool", async function () {
      await pool.add(lptoken_1.address, toWei("5"), false);
      await pool.add(lptoken_2.address, toWei("5"), true);

      await lptoken_1.mint(dev_account.address, toWei("1000"));
      await lptoken_1.approve(pool.address, toWei("1000"));
      await pool.stake(1, toWei("100"));

      await mineBlocks(5);

      await expect(pool.setDegisReward(1, 0, true))
        .to.emit(pool, "PoolUpdated")
        .withArgs(1);
    });

    it("should be able to manually mass update the pools", async function () {
      await pool.add(lptoken_1.address, toWei("5"), false);

      await lptoken_1.mint(dev_account.address, toWei("1000"));
      await lptoken_1.approve(pool.address, toWei("1000"));
      await pool.stake(1, toWei("100"));

      await expect(pool.massUpdatePools())
        .to.emit(pool, "PoolUpdated")
        .withArgs(1);
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
