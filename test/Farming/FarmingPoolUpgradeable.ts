import { expect } from "chai";
import { ethers } from "hardhat";
import {
  DegisToken,
  DegisToken__factory,
  DoubleRewarder,
  DoubleRewarder__factory,
  MockERC20,
  MockERC20__factory,
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
import { FarmingPoolUpgradeable__factory } from "../../typechain/factories/FarmingPoolUpgradeable__factory";
import { FarmingPoolUpgradeable } from "../../typechain/FarmingPoolUpgradeable";

describe("Farming Pool Upgradeable", function () {
  let FarmingPool: FarmingPoolUpgradeable__factory,
    pool: FarmingPoolUpgradeable;
  let DegisToken: DegisToken__factory, degis: DegisToken;
  let VeDEGToken: VoteEscrowedDegis__factory, veDEG: VoteEscrowedDegis;
  let MockERC20: MockERC20__factory, lptoken_1: MockERC20, lptoken_2: MockERC20;
  let MockUSD: MockUSD__factory, lptoken_3: MockUSD;

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

    FarmingPool = await ethers.getContractFactory("FarmingPoolUpgradeable");
    pool = await FarmingPool.deploy();
    await pool.deployed();
    await pool.initialize(degis.address);

    VeDEGToken = await ethers.getContractFactory("VoteEscrowedDegis");
    veDEG = await VeDEGToken.deploy();
    await veDEG.deployed();
    // Initialize veDEG
    await veDEG.initialize(degis.address, pool.address);

    // Two lptoken contracts (18 decimals)
    // They will be added as farming pools
    MockERC20 = await ethers.getContractFactory("MockERC20");
    lptoken_1 = await MockERC20.deploy();
    lptoken_2 = await MockERC20.deploy();

    // 6 decimals
    MockUSD = await ethers.getContractFactory("MockUSD");
    lptoken_3 = await MockUSD.deploy();

    // Add minter role for farming pool contract
    await degis.addMinter(pool.address);

    // Set veDEG address in farming
    await pool.setVeDEG(veDEG.address);
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
      expect(defaultPool.basicDegisPerSecond).to.equal(0);
      expect(defaultPool.bonusDegisPerSecond).to.equal(0);
      expect(defaultPool.lastRewardTimestamp).to.equal(0);
      expect(defaultPool.accDegisPerShare).to.equal(0);
      expect(defaultPool.accDegisPerBonusShare).to.equal(0);
      expect(defaultPool.totalBonus).to.equal(0);
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
      await pool.add(
        lptoken_1.address,
        toWei("5"),
        toWei("1"),
        false,
        zeroAddress()
      );
      await expect(pool.setStartTimestamp(60000)).to.be.revertedWith(
        "Can not set start timestamp after adding a pool"
      );

      await pool.add(
        lptoken_2.address,
        toWei("5"),
        toWei("1"),
        false,
        zeroAddress()
      );
      await expect(pool.setStartTimestamp(60000)).to.be.revertedWith(
        "Can not set start timestamp after adding a pool"
      );
    });

    it("should be able to pause the contract", async function () {
      await expect(pool.connect(user1).pause()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
      await expect(pool.pause())
        .to.emit(pool, "Paused")
        .withArgs(dev_account.address);

      await expect(
        pool.add(
          lptoken_1.address,
          toWei("5"),
          toWei("1"),
          false,
          zeroAddress()
        )
      ).to.be.revertedWith("Pausable: paused");
    });

    it("should be able to unpause the contract", async function () {
      await pool.pause();

      await expect(
        pool.add(lptoken_1.address, toWei("5"), 0, false, zeroAddress())
      ).to.be.revertedWith("Pausable: paused");

      await expect(pool.unpause())
        .to.emit(pool, "Unpaused")
        .withArgs(dev_account.address);

      await expect(
        pool.add(
          lptoken_1.address,
          toWei("5"),
          toWei("1"),
          false,
          zeroAddress()
        )
      ).to.emit(pool, "NewPoolAdded");
    });

    it("should be able to add new pools", async function () {
      const blockTimestampBefore = await getLatestBlockTimestamp(
        ethers.provider
      );

      await expect(
        pool.add(
          lptoken_1.address,
          toWei("5"),
          toWei("1"),
          false,
          zeroAddress()
        )
      )
        .to.emit(pool, "NewPoolAdded")
        .withArgs(lptoken_1.address, toWei("5"), toWei("1"));

      await expect(
        pool.add(
          lptoken_2.address,
          toWei("5"),
          toWei("1"),
          false,
          zeroAddress()
        )
      )
        .to.emit(pool, "NewPoolAdded")
        .withArgs(lptoken_2.address, toWei("5"), toWei("1"));

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
      expect(pool_0.basicDegisPerSecond).to.equal(0);
      expect(pool_0.bonusDegisPerSecond).to.equal(0);
      expect(pool_0.lastRewardTimestamp).to.equal(0);
      expect(pool_0.accDegisPerShare).to.equal(0);
      expect(pool_0.accDegisPerBonusShare).to.equal(0);
      expect(pool_0.totalBonus).to.equal(0);

      // Pool 1: lptoken_1
      const pool_1 = poolList[1];
      expect(pool_1.lpToken).to.equal(lptoken_1.address);
      expect(pool_1.basicDegisPerSecond).to.equal(toWei("5"));
      expect(pool_1.bonusDegisPerSecond).to.equal(toWei("1"));
      expect(pool_1.lastRewardTimestamp).to.equal(blockTimestampBefore + 1);
      expect(pool_1.accDegisPerShare).to.equal(0);
      expect(pool_1.accDegisPerBonusShare).to.equal(0);
      expect(pool_1.totalBonus).to.equal(0);

      // Pool 2: lptoken_2
      const pool_2 = poolList[2];
      expect(pool_2.lpToken).to.equal(lptoken_2.address);
      expect(pool_2.basicDegisPerSecond).to.equal(toWei("5"));
      expect(pool_2.bonusDegisPerSecond).to.equal(toWei("1"));
      expect(pool_2.lastRewardTimestamp).to.equal(blockTimestampBefore + 2);
      expect(pool_2.accDegisPerShare).to.equal(0);
      expect(pool_2.accDegisPerBonusShare).to.equal(0);
      expect(pool_2.totalBonus).to.equal(0);
    });

    it("should not be able to add two same pools", async function () {
      await pool.add(
        lptoken_1.address,
        toWei("5"),
        toWei("1"),
        false,
        zeroAddress()
      );

      await expect(
        pool.add(
          lptoken_1.address,
          toWei("5"),
          toWei("1"),
          false,
          zeroAddress()
        )
      ).to.be.revertedWith("Already in the pool");
    });

    it("should be able to set degis reward of a pool", async function () {
      await pool.add(
        lptoken_1.address,
        toWei("5"),
        toWei("1"),
        false,
        zeroAddress()
      );
      const poolId = await pool.poolMapping(lptoken_1.address);

      await expect(pool.setDegisReward(poolId, toWei("10"), toWei("2"), false))
        .to.emit(pool, "DegisRewardChanged")
        .withArgs(poolId, toWei("10"), toWei("2"));

      const poolList = await pool.getPoolList();
      expect(poolList[poolId.toNumber()].basicDegisPerSecond).to.equal(
        toWei("10")
      );
      expect(poolList[poolId.toNumber()].bonusDegisPerSecond).to.equal(
        toWei("2")
      );
    });

    it("should be able to stop a existing pool", async function () {
      await pool.add(
        lptoken_1.address,
        toWei("5"),
        toWei("1"),
        false,
        zeroAddress()
      );

      const poolId = await pool.poolMapping(lptoken_1.address);

      const blockTimestampBefore = await getLatestBlockTimestamp(
        ethers.provider
      );

      await expect(pool.setDegisReward(poolId, 0, 0, false))
        .to.emit(pool, "FarmingPoolStopped")
        .withArgs(poolId, blockTimestampBefore + 1);

      await expect(
        pool.setDegisReward(poolId, 0, toWei("1"), false)
      ).to.be.revertedWith("Only bonus");
    });

    it("should be able to restart a farming pool", async function () {
      await pool.add(
        lptoken_1.address,
        toWei("5"),
        toWei("1"),
        false,
        zeroAddress()
      );
      const poolId = await pool.poolMapping(lptoken_1.address);

      // Stop a pool
      await pool.setDegisReward(poolId, 0, 0, false);

      const blockTimestampBefore = await getLatestBlockTimestamp(
        ethers.provider
      );

      // Restart
      await expect(pool.setDegisReward(poolId, toWei("10"), 0, false))
        .to.emit(pool, "FarmingPoolStarted")
        .withArgs(poolId, blockTimestampBefore + 1);

      // Stop a pool
      await pool.setDegisReward(poolId, 0, 0, false);

      await expect(pool.setDegisReward(poolId, toWei("10"), toWei("1"), false))
        .to.emit(pool, "FarmingPoolStarted")
        .withArgs(poolId, blockTimestampBefore + 3);
    });
  });

  describe("User Functions: Deposit, Redeem and Harvest", function () {
    beforeEach(async function () {
      // Add lptoken_1
      // Reward speed: 5 degis per block
      await pool.add(
        lptoken_1.address,
        toWei("5"),
        toWei("1"),
        false,
        zeroAddress()
      );
      // Add lptoken_3
      // Reward speed: 5 degis per block
      await pool.add(
        lptoken_3.address,
        toWei("5"),
        toWei("1"),
        false,
        zeroAddress()
      );
    });

    it("should be able to deposit lptokens", async function () {
      await lptoken_1.mint(dev_account.address, toWei("1000"));
      await lptoken_1.approve(pool.address, toWei("1000"));

      await expect(pool.stake(1, toWei("100")))
        .to.emit(pool, "Stake")
        .withArgs(dev_account.address, 1, toWei("100"));
    });

    it("should be able to deposit lptokens and get user balance", async function () {
      await lptoken_1.mint(dev_account.address, toWei("1000"));
      await lptoken_1.approve(pool.address, toWei("1000"));

      await pool.stake(1, toWei("100"));
      expect(await pool.getUserBalance(1, dev_account.address)).to.equal(
        toWei("100")
      );
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

  describe("Bonus with veDEG", function () {
    beforeEach(async function () {
      // Add lptoken_1
      // Reward speed: 5 degis per block
      await pool.add(
        lptoken_1.address,
        toWei("5"),
        toWei("1"),
        false,
        zeroAddress()
      );
      // Add lptoken_3
      // Reward speed: 5 degis per block
      await pool.add(
        lptoken_3.address,
        toWei("5"),
        toWei("1"),
        false,
        zeroAddress()
      );

      // Mint degis
      await degis.mintDegis(dev_account.address, toWei("100"));
      await degis.mintDegis(user1.address, toWei("100"));

      // Approve degis for veDEG
      await degis.approve(veDEG.address, toWei("100"));
      await degis.connect(user1).approve(veDEG.address, toWei("100"));
    });

    it("should be able to get bonus reward", async function () {
      // Stake and get veDEG
      await veDEG.deposit(toWei("100"));
      await veDEG.connect(user1).deposit(toWei("100"));

      await veDEG.claim();
      await veDEG.connect(user1).claim();

      // 2 seconds reward: 2 x 1 x 100 = 200 veDEG
      expect(await veDEG.balanceOf(dev_account.address)).to.equal(toWei("200"));
      expect(await veDEG.balanceOf(user1.address)).to.equal(toWei("200"));

      await lptoken_1.mint(dev_account.address, toWei("1000"));
      await lptoken_1.approve(pool.address, toWei("1000"));
      await pool.stake(1, toWei("100"));

      await mineBlocks(1);

      const poolInfo = await pool.poolList(1);

      const pending = await pool.pendingDegis(1, dev_account.address);
      console.log(formatEther(pending));
    });

    it("should be able to harvest bonus reward", async function () {});
  });

  describe("Pool Update", function () {
    it("should be able to update the pools when add a new pool", async function () {
      await pool.add(
        lptoken_1.address,
        toWei("5"),
        toWei("1"),
        false,
        zeroAddress()
      );

      await lptoken_1.mint(dev_account.address, toWei("1000"));
      await lptoken_1.approve(pool.address, toWei("1000"));
      await pool.stake(1, toWei("100"));

      // accDegisPerShare = 5 * 1 * 1e12 / 100 = 5e10
      await expect(
        pool.add(lptoken_2.address, toWei("5"), toWei("1"), true, zeroAddress())
      )
        .to.emit(pool, "PoolUpdated")
        .withArgs(1, parseUnits("5", 10), 0);
    });

    it("should be able to update the pools when stop a pool", async function () {
      await pool.add(
        lptoken_1.address,
        toWei("5"),
        toWei("1"),
        false,
        zeroAddress()
      );
      await pool.add(
        lptoken_2.address,
        toWei("5"),
        toWei("1"),
        true,
        zeroAddress()
      );

      await lptoken_1.mint(dev_account.address, toWei("1000"));
      await lptoken_1.approve(pool.address, toWei("1000"));
      await pool.stake(1, toWei("100"));

      await mineBlocks(5);

      // accDegisPerShare = 5 * 6 * 1e12 / 100 = 3e11
      await expect(pool.setDegisReward(1, 0, 0, true))
        .to.emit(pool, "PoolUpdated")
        .withArgs(1, parseUnits("3", 11), 0);
    });

    it("should be able to update correctly when restart a farming pool", async function () {
      await pool.add(
        lptoken_1.address,
        toWei("1"),
        toWei("1"),
        false,
        zeroAddress()
      );

      await lptoken_1.mint(dev_account.address, toWei("1000"));
      await lptoken_1.approve(pool.address, toWei("1000"));
      await pool.stake(1, toWei("100"));

      await mineBlocks(5);
      expect(await pool.pendingDegis(1, dev_account.address)).to.equal(
        toWei("5")
      );

      await pool.setDegisReward(1, 0, 0, true);
      expect(await pool.pendingDegis(1, dev_account.address)).to.equal(
        toWei("6")
      );
      await mineBlocks(5);
      expect(await pool.pendingDegis(1, dev_account.address)).to.equal(
        toWei("6")
      );

      await pool.setDegisReward(1, toWei("1"), toWei("1"), true);
      await mineBlocks(5);
      expect(await pool.pendingDegis(1, dev_account.address)).to.equal(
        toWei("11")
      );
    });

    it("should be able to manually mass update the pools", async function () {
      await pool.add(
        lptoken_1.address,
        toWei("5"),
        toWei("1"),
        false,
        zeroAddress()
      );

      await lptoken_1.mint(dev_account.address, toWei("1000"));
      await lptoken_1.approve(pool.address, toWei("1000"));
      await pool.stake(1, toWei("100"));

      // accDegisPerShare = 5 * 1 * 1e12 / 100 = 5e10
      await expect(pool.massUpdatePools())
        .to.emit(pool, "PoolUpdated")
        .withArgs(1, parseUnits("5", 10), 0);
    });
  });

  describe("Piecewise reward change", function () {
    beforeEach(async function () {
      await pool.add(
        lptoken_1.address,
        toWei("1"),
        toWei("1"),
        false,
        zeroAddress()
      );

      await lptoken_1.mint(dev_account.address, toWei("1000"));
      await lptoken_1.approve(pool.address, toWei("1000"));
    });
    it("should be able to set piecewise reward level", async function () {
      await pool.setPiecewise(
        1,
        [0, toWei("10"), toWei("100")],
        [toWei("1"), toWei("2"), toWei("3")]
      );

      const threshold_1 = await pool.thresholdBasic(1, 1);
      expect(threshold_1).to.equal(toWei("10"));
      const threshold_2 = await pool.thresholdBasic(1, 2);
      expect(threshold_2).to.equal(toWei("100"));

      const reward_level0 = await pool.piecewiseBasic(1, 0);
      expect(reward_level0).to.equal(toWei("1"));
      const reward_level1 = await pool.piecewiseBasic(1, 1);
      expect(reward_level1).to.equal(toWei("2"));
      const reward_level2 = await pool.piecewiseBasic(1, 2);
      expect(reward_level2).to.equal(toWei("3"));
    });

    it("should be able to update reward level when update pools", async function () {
      await pool.setPiecewise(
        1,
        [0, toWei("10"), toWei("100")],
        [toWei("1"), toWei("2"), toWei("3")]
      );
      // Start with level 0
      expect((await pool.poolList(1)).basicDegisPerSecond).to.equal(toWei("1"));

      // Deposit amount: 1 => reward 1
      await pool.stake(1, toWei("1"));
      expect((await pool.poolList(1)).basicDegisPerSecond).to.equal(toWei("1"));

      // Deposit amount: 10 => reward 1
      await pool.stake(1, toWei("9"));
      await pool.updatePool(1);
      expect((await pool.poolList(1)).basicDegisPerSecond).to.equal(toWei("2"));

      // Deposit amount: 11 => reward 2
      // await pool.stake(1, toWei("1"));
      // poolInfo = await pool.poolList(1);
      // expect(poolInfo.basicDegisPerSecond).to.equal(toWei("2"));

      // await pool.updatePool(1);
      // poolInfo = await pool.poolList(1);
      // expect(poolInfo.basicDegisPerSecond).to.equal(toWei("2"));

      // 100
      await pool.stake(1, toWei("90"));
      await pool.updatePool(1);
      expect((await pool.poolList(1)).basicDegisPerSecond).to.equal(toWei("3"));

      // 120
      await pool.stake(1, toWei("20"));
      await pool.updatePool(1);
      expect((await pool.poolList(1)).basicDegisPerSecond).to.equal(toWei("3"));

      // 90
      await pool.withdraw(1, toWei("30"));
      await pool.updatePool(1);
      expect((await pool.poolList(1)).basicDegisPerSecond).to.equal(toWei("2"));

      // 70
      await pool.withdraw(1, toWei("20"));
      await pool.updatePool(1);
      expect((await pool.poolList(1)).basicDegisPerSecond).to.equal(toWei("2"));

      // down level  9
      await pool.withdraw(1, toWei("61"));
      await pool.updatePool(1);
      expect((await pool.poolList(1)).basicDegisPerSecond).to.equal(toWei("1"));
    });

    it("should be able to get correct rewards with piecewise update", async function () {
      await pool.setPiecewise(
        1,
        [0, toWei("10"), toWei("100")],
        [toWei("1"), toWei("2"), toWei("3")]
      );

      await pool.stake(1, toWei("1"));

      await mineBlocks(5);
      expect(await pool.pendingDegis(1, dev_account.address)).to.equal(
        toWei("5")
      );

      await pool.stake(1, toWei("9"));
      expect(await pool.pendingDegis(1, dev_account.address)).to.equal(0);
      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("6"));

      await pool.updatePool(1);

      expect(await pool.pendingDegis(1, dev_account.address)).to.equal(
        toWei("1")
      );
      await mineBlocks(1);
      expect(await pool.pendingDegis(1, dev_account.address)).to.equal(
        toWei("3")
      );

      // pending: 3 + 2 = 5
      // previous balance: 6
      // total: 11
      await pool.withdraw(1, toWei("5"));
      expect(await pool.pendingDegis(1, dev_account.address)).to.equal(0);
      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("11"));
      expect((await pool.poolList(1)).basicDegisPerSecond).to.equal(toWei("2"));

      await pool.updatePool(1);
      expect((await pool.poolList(1)).basicDegisPerSecond).to.equal(toWei("1"));
      expect(await pool.pendingDegis(1, dev_account.address)).to.equal(
        toWei("2")
      );

      await mineBlocks(1);
      expect(await pool.pendingDegis(1, dev_account.address)).to.equal(
        toWei("3")
      );

      await pool.withdraw(1, toWei("2"));
      expect(await pool.pendingDegis(1, dev_account.address)).to.equal(0);
      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("15"));
      expect((await pool.poolList(1)).basicDegisPerSecond).to.equal(toWei("1"));
    });
  });

  describe("Double Reward", function () {
    let doubleRewardToken: MockERC20;
    let doubleRewardContract: DoubleRewarder;

    beforeEach(async function () {
      // Deploy double reward token
      const doubleRewardTokenFactory: MockERC20__factory =
        await ethers.getContractFactory("MockERC20");
      doubleRewardToken = await doubleRewardTokenFactory.deploy();

      // Deploy double reward contract
      const DoubleRewardContractFactory: DoubleRewarder__factory =
        await ethers.getContractFactory("DoubleRewarder");
      doubleRewardContract = await DoubleRewardContractFactory.deploy();
      await doubleRewardContract.initialize(pool.address);

      await pool.setDoubleRewarderContract(doubleRewardContract.address);

      // Add a pool with double reward
      await pool.add(
        lptoken_1.address,
        toWei("1"),
        toWei("1"),
        false,
        doubleRewardToken.address
      );

      await lptoken_1.mint(dev_account.address, toWei("1000"));
      await lptoken_1.approve(pool.address, toWei("1000"));

      await lptoken_1.mint(user1.address, toWei("1000"));
      await lptoken_1.connect(user1).approve(pool.address, toWei("1000"));

      await doubleRewardToken.mint(doubleRewardContract.address, toWei("100"));
    });

    it("should be able to add double reward token", async function () {
      await expect(
        doubleRewardContract.addRewardToken(
          doubleRewardToken.address,
          lptoken_1.address
        )
      )
        .to.emit(doubleRewardContract, "NewRewardTokenAdded")
        .withArgs(doubleRewardToken.address);
    });

    it("should be able to get double reward when deposit", async function () {
      await doubleRewardContract.addRewardToken(
        doubleRewardToken.address,
        lptoken_1.address
      );
      await doubleRewardContract.setRewardSpeed(
        lptoken_1.address,
        doubleRewardToken.address,
        toWei("2")
      );

      // Stake for 1
      await pool.stake(1, toWei("1"));

      await mineBlocks(5);

      // Stake for 1
      await pool.stake(1, toWei("1"));

      // DEG reward = 6 * 1 = 6
      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("6"));
      // Double reward = 6 * 2 = 12
      // But record only
      expect(await doubleRewardToken.balanceOf(dev_account.address)).to.equal(
        0
      );
      expect(
        await doubleRewardContract.userPendingReward(
          dev_account.address,
          doubleRewardToken.address
        )
      ).to.equal(toWei("12"));

      await pool.stake(1, toWei("1"));

      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("7"));
      expect(await doubleRewardToken.balanceOf(dev_account.address)).to.equal(
        0
      );
      expect(
        await doubleRewardContract.userPendingReward(
          dev_account.address,
          doubleRewardToken.address
        )
      ).to.equal(toWei("14"));
    });

    it("should be able to get double reward when multi-users deposit", async function () {
      await doubleRewardContract.addRewardToken(
        doubleRewardToken.address,
        lptoken_1.address
      );
      await doubleRewardContract.setRewardSpeed(
        lptoken_1.address,
        doubleRewardToken.address,
        toWei("2")
      );

      await pool.stake(1, toWei("1"));

      await pool.connect(user1).stake(1, toWei("1"));

      await pool.stake(1, toWei("1"));
      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("1.5"));
      expect(await doubleRewardToken.balanceOf(dev_account.address)).to.equal(
        0
      );
      expect(
        await doubleRewardContract.userPendingReward(
          dev_account.address,
          doubleRewardToken.address
        )
      ).to.equal(toWei("3"));
    });

    it("should be able to check pending reward for double reward token", async function () {
      // First add reward token and set reward speed
      await doubleRewardContract.addRewardToken(
        doubleRewardToken.address,
        lptoken_1.address
      );
      await doubleRewardContract.setRewardSpeed(
        lptoken_1.address,
        doubleRewardToken.address,
        toWei("2")
      );

      // Dev stake 1
      await pool.stake(1, toWei("1"));

      // Pending reward should be zero
      expect(
        await doubleRewardContract.pendingReward(
          doubleRewardToken.address,
          dev_account.address
        )
      ).to.equal(0);

      // User1 stake 1
      await pool.connect(user1).stake(1, toWei("1"));

      // Pending reward for dev should be 1 * 2 = 2
      expect(
        await doubleRewardContract.pendingReward(
          doubleRewardToken.address,
          dev_account.address
        )
      ).to.equal(toWei("2"));

      // Pending reward for user1 should be 0
      expect(
        await doubleRewardContract.pendingReward(
          doubleRewardToken.address,
          user1.address
        )
      ).to.equal(0);

      // 1 more block
      await mineBlocks(1);

      // Pending reward for dev should be 1 * 2 + 1 * 2 / 2 = 3
      expect(
        await doubleRewardContract.pendingReward(
          doubleRewardToken.address,
          dev_account.address
        )
      ).to.equal(toWei("3"));

      // Pending reward for user1 should be 1 * 2 / 2 = 1
      expect(
        await doubleRewardContract.pendingReward(
          doubleRewardToken.address,
          user1.address
        )
      ).to.equal(toWei("1"));

      // 1 more block
      await mineBlocks(1);

      // Pending reward for dev should be 1 * 2 + 2 * 2 / 2 = 4
      expect(
        await doubleRewardContract.pendingReward(
          doubleRewardToken.address,
          dev_account.address
        )
      ).to.equal(toWei("4"));

      // Pending reward for user1 should be 2 * 2 / 2 = 2
      expect(
        await doubleRewardContract.pendingReward(
          doubleRewardToken.address,
          user1.address
        )
      ).to.equal(toWei("2"));

      await pool.stake(1, toWei("2"));

      // Pending reward for dev should be transferred to user pending reward
      expect(
        await doubleRewardContract.pendingReward(
          doubleRewardToken.address,
          dev_account.address
        )
      ).to.equal(0);
      expect(
        await doubleRewardContract.userPendingReward(
          dev_account.address,
          doubleRewardToken.address
        )
      ).to.equal(toWei("5"));

      // Pending reward for user1 should be transferred to user pending reward
      expect(
        await doubleRewardContract.pendingReward(
          doubleRewardToken.address,
          user1.address
        )
      ).to.equal(toWei("3"));
      expect(
        await doubleRewardContract.userPendingReward(
          user1.address,
          doubleRewardToken.address
        )
      ).to.equal(0);

      await mineBlocks(1);

      // Pending reward for dev should be transferred to user pending reward
      expect(
        await doubleRewardContract.pendingReward(
          doubleRewardToken.address,
          dev_account.address
        )
      ).to.equal(toWei("1.5"));
      expect(
        await doubleRewardContract.userPendingReward(
          dev_account.address,
          doubleRewardToken.address
        )
      ).to.equal(toWei("5"));

      // Pending reward for user1 should be transferred to user pending reward
      expect(
        await doubleRewardContract.pendingReward(
          doubleRewardToken.address,
          user1.address
        )
      ).to.equal(toWei("3.5"));
      expect(
        await doubleRewardContract.userPendingReward(
          user1.address,
          doubleRewardToken.address
        )
      ).to.equal(0);
    });

    it("should be able to claim reward", async function () {
      await doubleRewardContract.addRewardToken(
        doubleRewardToken.address,
        lptoken_1.address
      );
      await doubleRewardContract.setRewardSpeed(
        lptoken_1.address,
        doubleRewardToken.address,
        toWei("2")
      );

      await pool.stake(1, toWei("1"));

      await pool.connect(user1).stake(1, toWei("1"));

      await pool.stake(1, toWei("1"));

      await expect(
        doubleRewardContract.claim(doubleRewardToken.address)
      ).to.be.revertedWith("Not claimable");

      await doubleRewardContract.setClaimable(
        doubleRewardToken.address,
        doubleRewardToken.address
      );

      expect(
        await doubleRewardContract.userPendingReward(
          dev_account.address,
          doubleRewardToken.address
        )
      ).to.equal(toWei("3"));

      await expect(doubleRewardContract.claim(doubleRewardToken.address))
        .to.emit(doubleRewardContract, "ClaimReward")
        .withArgs(doubleRewardToken.address, dev_account.address, toWei("3"));

      expect(await doubleRewardToken.balanceOf(dev_account.address)).to.equal(
        toWei("3")
      );
    });

    it("should be able to claim reward during farming", async function () {
      await doubleRewardContract.addRewardToken(
        doubleRewardToken.address,
        lptoken_1.address
      );
      await doubleRewardContract.setRewardSpeed(
        lptoken_1.address,
        doubleRewardToken.address,
        toWei("6")
      );

      await pool.stake(1, toWei("1"));

      // Dev: 6  User1: 0
      await pool.connect(user1).stake(1, toWei("1"));

      // Dev: 6 + 3  User1: 3
      await pool.stake(1, toWei("1"));

      // Dev: 13 (9)(0)  User1: 5 (0)(0)
      await doubleRewardContract.setClaimable(
        doubleRewardToken.address,
        doubleRewardToken.address
      );

      // Dev: 17 (9)(9)  User1: 7 (0)(0)
      await doubleRewardContract.claim(doubleRewardToken.address);

      expect(await doubleRewardToken.balanceOf(dev_account.address)).to.equal(
        toWei("9")
      );

      // Dev: 21 (9)(9)  User1: 9 (0)(0)
      await mineBlocks(1);

      // expect(
      //   await doubleRewardContract.pendingReward(
      //     doubleRewardToken.address,
      //     dev_account.address
      //   )
      // ).to.equal(toWei("9"));
      expect(
        await doubleRewardContract.userPendingReward(
          dev_account.address,
          doubleRewardToken.address
        )
      ).to.equal(0);
      // Dev: 25 (9)(9)  User1: 11 (0)(0)
      await doubleRewardContract.claim(doubleRewardToken.address);
      expect(await doubleRewardToken.balanceOf(dev_account.address)).to.equal(
        toWei("9")
      );

      // Dev: 29 (29)(9)  User1: 15 (0)(0)
      await pool.harvest(1, dev_account.address);
      expect(
        await doubleRewardContract.userPendingReward(
          dev_account.address,
          doubleRewardToken.address
        )
      ).to.equal(toWei("20")); // 29 - 9 = 20

      // Dev: 33 (29)(29)  User1: 17 (0)(0)
      await doubleRewardContract.claim(doubleRewardToken.address);
      expect(await doubleRewardToken.balanceOf(dev_account.address)).to.equal(
        toWei("29")
      );
    });

    // Case: Double reward token is added but reward is zero
    //       And users have staked some assets into farming pool
    //       Check the reward status for this case
    it("should be able to work when zero reward speed exist", async function () {
      await doubleRewardContract.addRewardToken(
        doubleRewardToken.address,
        lptoken_1.address
      );

      await pool.stake(1, toWei("1"));

      await mineBlocks(5);

      expect(
        await doubleRewardContract.pendingReward(
          doubleRewardToken.address,
          dev_account.address
        )
      ).to.equal(toWei("0"));
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
