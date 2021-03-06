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
  customErrorMsg,
  getLatestBlockTimestamp,
  stablecoinToWei,
  toWei,
  zeroAddress,
} from "../utils";
import { BigNumberish, Signer } from "ethers";
import { formatEther, parseUnits } from "ethers/lib/utils";

describe("Vote Escrowed Degis", function () {
  let FarmingPool: FarmingPoolUpgradeable__factory,
    pool: FarmingPoolUpgradeable;
  let DegisToken: DegisToken__factory, degis: DegisToken;
  let MockUSD: MockUSD__factory, usd: MockUSD;
  let VeDEGToken: VoteEscrowedDegis__factory, veDEG: VoteEscrowedDegis;

  let dev_account: SignerWithAddress,
    user1: SignerWithAddress,
    user2: SignerWithAddress,
    nftStaking: SignerWithAddress;

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
    [dev_account, user1, user2, nftStaking] = await ethers.getSigners();

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
      await pool.add(usd.address, toWei("1"), toWei("1"), false, zeroAddress());

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
      await pool.add(usd.address, toWei("1"), toWei("1"), false, zeroAddress());

      await degis.mintDegis(dev_account.address, toWei("1000"));
      await degis.approve(veDEG.address, toWei("1000"));

      await veDEG.addWhitelist(user1.address);
    });
    it("should be able to burn veDEG as entrance", async function () {
      await veDEG.deposit(toWei("100"));

      await mineBlocks(100);
      await veDEG.claim();

      expect(await veDEG.balanceOf(dev_account.address)).to.equal(
        toWei("10000")
      );

      await veDEG.connect(user1).burnVeDEG(dev_account.address, toWei("100"));

      // Burn veDEG => balance decrease
      expect(await veDEG.balanceOf(dev_account.address)).to.equal(
        toWei("9900")
      );

      // Balance less than max amount after the burn
      // So it will restart to gain veDEG
      await mineBlocks(1);
      expect(await veDEG.claimable(dev_account.address)).to.equal(toWei("100"));

      // Also can not exceed the max amount
      await mineBlocks(10);
      expect(await veDEG.claimable(dev_account.address)).to.equal(toWei("100"));

      // Burn for the second time
      await veDEG.connect(user1).burnVeDEG(dev_account.address, toWei("100"));
      expect(await veDEG.claimable(dev_account.address)).to.equal(toWei("200"));

      await mineBlocks(1);
      expect(await veDEG.claimable(dev_account.address)).to.equal(toWei("200"));

      // After claim, balance back to max amount
      await veDEG.claim();
      expect(await veDEG.balanceOf(dev_account.address)).to.equal(
        toWei("10000")
      );
    });
  });

  describe("Whitelist contract lock veDEG", function () {
    beforeEach(async function () {
      await degis.mintDegis(dev_account.address, toWei("1000"));
      await degis.approve(veDEG.address, toWei("1000"));

      await veDEG.addWhitelist(user1.address);
    });

    it("should not be able to lock & unlock veDEG by accounts other than whitelist", async function () {
      await veDEG.deposit(toWei("100"));

      // Owner can not lock
      await expect(
        veDEG.lockVeDEG(dev_account.address, toWei("100"))
      ).to.be.revertedWith(customErrorMsg("'VED__NotWhiteListed()'"));

      await expect(
        veDEG.unlockVeDEG(dev_account.address, toWei("100"))
      ).to.be.revertedWith(customErrorMsg("'VED__NotWhiteListed()'"));

      // Not whitelisted accounts can not lock
      await expect(
        veDEG.connect(user2).lockVeDEG(dev_account.address, toWei("100"))
      ).to.be.revertedWith(customErrorMsg("'VED__NotWhiteListed()'"));

      await expect(
        veDEG.connect(user2).unlockVeDEG(dev_account.address, toWei("100"))
      ).to.be.revertedWith(customErrorMsg("'VED__NotWhiteListed()'"));
    });

    it("should be able to lock and unlock veDEG", async function () {
      await veDEG.deposit(toWei("100"));

      await veDEG.claim();
      expect(await veDEG.balanceOf(dev_account.address)).to.equal(toWei("100"));

      await expect(
        veDEG.connect(user1).lockVeDEG(dev_account.address, toWei("100"))
      )
        .to.emit(veDEG, "LockVeDEG")
        .withArgs(user1.address, dev_account.address, toWei("100"));

      // Check lock status
      expect(await veDEG.locked(dev_account.address)).to.equal(toWei("100"));

      // Can not withdraw when locked
      await expect(veDEG.withdraw(toWei("100"))).to.be.revertedWith(
        customErrorMsg("'VED__StillLocked()'")
      );

      await expect(
        veDEG.connect(user1).unlockVeDEG(dev_account.address, toWei("100"))
      )
        .to.emit(veDEG, "UnlockVeDEG")
        .withArgs(user1.address, dev_account.address, toWei("100"));

      // Can withdraw after unlock
      await veDEG.withdraw(toWei("100"));
      expect(await degis.balanceOf(dev_account.address)).to.equal(
        toWei("1000")
      );
      expect(await veDEG.balanceOf(dev_account.address)).to.equal(0);
    });
  });

  describe("Boost veDEG by nft staking", function () {
    beforeEach(async function () {
      await veDEG.setNFTStaking(nftStaking.address);

      await degis.mintDegis(dev_account.address, toWei("1000"));
      await degis.approve(veDEG.address, toWei("1000"));

      await degis.mintDegis(user1.address, toWei("1000"));
      await degis.connect(user1).approve(veDEG.address, toWei("1000"));

      await degis.mintDegis(user2.address, toWei("1000"));
      await degis.connect(user2).approve(veDEG.address, toWei("1000"));

      await veDEG.deposit(toWei("100"));
    });

    it("should not be able to boost by addresses other than nftStaking", async function () {
      await expect(
        veDEG.connect(user1).boostVeDEG(dev_account.address, 1)
      ).to.be.revertedWith(customErrorMsg("'VED__NotNftStaking()'"));
    });

    it("should be able to boost veDEG for its current balance - type 1", async function () {
      expect(await veDEG.balanceOf(dev_account.address)).to.equal(0);
      await veDEG.claim();
      expect(await veDEG.balanceOf(dev_account.address)).to.equal(toWei("100"));

      await expect(veDEG.connect(nftStaking).boostVeDEG(dev_account.address, 1))
        .to.emit(veDEG, "BoostVeDEG")
        .withArgs(dev_account.address, 1);

      expect(await veDEG.balanceOf(dev_account.address)).to.equal(toWei("120"));
    });

    it("should be able to boost veDEG for its current balance - type 2", async function () {
      expect(await veDEG.balanceOf(dev_account.address)).to.equal(0);
      await veDEG.claim();
      expect(await veDEG.balanceOf(dev_account.address)).to.equal(toWei("100"));

      await expect(veDEG.connect(nftStaking).boostVeDEG(dev_account.address, 2))
        .to.emit(veDEG, "BoostVeDEG")
        .withArgs(dev_account.address, 2);

      expect(await veDEG.balanceOf(dev_account.address)).to.equal(toWei("150"));
    });

    it("should be able to unBoost veDEG", async function () {
      await veDEG.claim();

      // Boost with type 1 and unboost
      await veDEG.connect(nftStaking).boostVeDEG(dev_account.address, 1);
      expect(await veDEG.balanceOf(dev_account.address)).to.equal(toWei("120"));

      await expect(veDEG.connect(nftStaking).unBoostVeDEG(dev_account.address))
        .to.emit(veDEG, "UnBoostVeDEG")
        .withArgs(dev_account.address);

      expect(await veDEG.balanceOf(dev_account.address)).to.equal(toWei("100"));

      // Boost with type 2 and unboost
      await veDEG.connect(nftStaking).boostVeDEG(dev_account.address, 2);
      expect(await veDEG.balanceOf(dev_account.address)).to.equal(toWei("150"));

      await expect(veDEG.connect(nftStaking).unBoostVeDEG(dev_account.address))
        .to.emit(veDEG, "UnBoostVeDEG")
        .withArgs(dev_account.address);

      expect(await veDEG.balanceOf(dev_account.address)).to.equal(toWei("100"));
    });

    it("should be able to update future veDEG generation with boost", async function () {
      await veDEG.claim();

      await veDEG.connect(nftStaking).boostVeDEG(dev_account.address, 1);

      expect(await veDEG.balanceOf(dev_account.address)).to.equal(toWei("120"));

      // 10 blocks  = 1200 new reward
      await mineBlocks(10);
      expect(await veDEG.claimable(dev_account.address)).to.equal(
        toWei("1320")
      );
      await veDEG.claim();
      expect(await veDEG.balanceOf(dev_account.address)).to.equal(
        toWei("1560")
      );
    });

    it("should be able to boost for those who deposit for max time", async function () {
      await veDEG.connect(user1).depositMaxTime(toWei("100"));

      await veDEG.connect(nftStaking).boostVeDEG(user1.address, 1);

      expect(await veDEG.balanceOf(user1.address)).to.equal(toWei("12000"));

      await mineBlocks(10);
      expect(await veDEG.balanceOf(user1.address)).to.equal(toWei("12000"));

      await veDEG.connect(nftStaking).unBoostVeDEG(user1.address);

      expect(await veDEG.balanceOf(user1.address)).to.equal(toWei("10000"));
    });

    it("should be able to withdraw when boosting - normal deposit", async function () {
      await veDEG.claim();

      expect(await veDEG.balanceOf(dev_account.address)).to.equal(toWei("100"));
      await veDEG.connect(nftStaking).boostVeDEG(dev_account.address, 1);

      expect(await veDEG.balanceOf(dev_account.address)).to.equal(toWei("120"));

      await veDEG.withdraw(toWei("100"));

      expect(await veDEG.balanceOf(dev_account.address)).to.equal(0);
    });

    it("should be able to withdraw when boosting - max time deposit", async function () {
      await veDEG.connect(user1).depositMaxTime(toWei("100"));
      const initTime = await getLatestBlockTimestamp(ethers.provider);

      expect(await veDEG.balanceOf(user1.address)).to.equal(toWei("10000"));
      await veDEG.connect(nftStaking).boostVeDEG(user1.address, 1);

      expect(await veDEG.balanceOf(user1.address)).to.equal(toWei("12000"));

      await setNextBlockTime(initTime + 365 * 24 * 3600);

      await veDEG.connect(user1).withdrawLocked();
      expect(await veDEG.balanceOf(user1.address)).to.equal(0);
    });

    it("should be able to withdraw when boosting - mix deposit", async function () {
      // Max time deposit + normal deposit
      await veDEG.depositMaxTime(toWei("100"));
      await veDEG.claim();

      // 2 blocks normal (200) + 10000 max time
      expect(await veDEG.balanceOf(dev_account.address)).to.equal(
        toWei("10200")
      );

      await veDEG.connect(nftStaking).boostVeDEG(dev_account.address, 1);

      // 10200 x 1.2
      expect(await veDEG.balanceOf(dev_account.address)).to.equal(
        toWei("12240")
      );
      await veDEG.claim();

      // [ 4 blocks normal (400) + 10000 max time ] * 1.2
      expect(await veDEG.balanceOf(dev_account.address)).to.equal(
        toWei("12480")
      );

      // withdraw normal part
      await veDEG.withdraw(toWei("100"));

      // Remaining max time part still boost
      expect(await veDEG.balanceOf(dev_account.address)).to.equal(
        toWei("12000")
      );
    });

    it("should be able to boost and unboost continuously", async function () {
      // Max time deposit + normal deposit
      await veDEG.depositMaxTime(toWei("100"));

      // 2 blocks normal (200) + 10000 max time
      expect(await veDEG.balanceOf(dev_account.address)).to.equal(
        toWei("10000")
      );

      await veDEG.connect(nftStaking).boostVeDEG(dev_account.address, 1);

      // 10200 x 1.2
      expect(await veDEG.balanceOf(dev_account.address)).to.equal(
        toWei("12000")
      );

      await veDEG.connect(nftStaking).unBoostVeDEG(dev_account.address);

      await veDEG.connect(nftStaking).boostVeDEG(dev_account.address, 1);

      // [ 4 blocks normal (400) + 10000 max time ] * 1.2
      expect(await veDEG.balanceOf(dev_account.address)).to.equal(
        toWei("12000")
      );
    });

    it("a case simulation", async function () {
      await veDEG.connect(user2).depositMaxTime(toWei("10"));

      await veDEG.connect(nftStaking).boostVeDEG(user2.address, 1);
      await veDEG.connect(nftStaking).unBoostVeDEG(user2.address);
      await veDEG.connect(nftStaking).boostVeDEG(user2.address, 1);

      expect(await veDEG.balanceOf(user2.address)).to.equal(toWei("1200"));
      expect(await veDEG.claimable(user2.address)).to.equal(toWei("0"));

      await veDEG.connect(user2).deposit(toWei("10"));

      await veDEG.connect(user2).depositMaxTime(toWei("5"));

      expect(await veDEG.balanceOf(user2.address)).to.equal(toWei("1800"));

      await veDEG.connect(nftStaking).unBoostVeDEG(user2.address);

      expect(await veDEG.balanceOf(user2.address)).to.equal(toWei("1500"));

      // Speed goes back to normal
      // 2 blocks => 20 veDEG
      expect(await veDEG.claimable(user2.address)).to.equal(toWei("20"));
    });

    it("should be able to boost with locking contracts", async function () {
      await veDEG.addWhitelist(dev_account.address);

      await veDEG.claim();
      expect(await veDEG.balanceOf(dev_account.address)).to.equal(toWei("200"));

      await veDEG.lockVeDEG(dev_account.address, toWei("10"));
      expect(await veDEG.balanceOf(dev_account.address)).to.equal(toWei("200"));
      expect(await veDEG.locked(dev_account.address)).to.equal(toWei("10"));

      await veDEG.connect(nftStaking).boostVeDEG(dev_account.address, 1);
      expect(await veDEG.claimable(dev_account.address)).to.equal(toWei("240"));
      expect(await veDEG.balanceOf(dev_account.address)).to.equal(toWei("240"));

      await mineBlocks(1);
      expect(await veDEG.claimable(dev_account.address)).to.equal(toWei("360"));

      await veDEG.claim();
      expect(await veDEG.balanceOf(dev_account.address)).to.equal(toWei("720"));
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
