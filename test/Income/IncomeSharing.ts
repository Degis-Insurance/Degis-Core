import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  DegisToken,
  DegisToken__factory,
  FarmingPoolUpgradeable,
  FarmingPoolUpgradeable__factory,
  IncomeSharingVault,
  IncomeSharingVault__factory,
  MockERC20,
  MockERC20__factory,
  MockUSD,
  MockUSD__factory,
  VoteEscrowedDegis,
  VoteEscrowedDegis__factory,
} from "../../typechain";
import { customErrorMsg, mineBlocks, stablecoinToWei, toWei } from "../utils";
import { parseUnits } from "ethers/lib/utils";

describe("Income Sharing", function () {
  let income: IncomeSharingVault;
  let veDEG: VoteEscrowedDegis;
  let degis: DegisToken;
  let farming: FarmingPoolUpgradeable;
  let usd: MockUSD;
  let shield: MockERC20;

  let dev_account: SignerWithAddress, user1: SignerWithAddress;

  beforeEach(async function () {
    [dev_account, user1] = await ethers.getSigners();

    degis = await new DegisToken__factory(dev_account).deploy();

    usd = await new MockUSD__factory(dev_account).deploy();
    shield = await new MockERC20__factory(dev_account).deploy();

    farming = await new FarmingPoolUpgradeable__factory(dev_account).deploy();
    await farming.initialize(degis.address);

    veDEG = await new VoteEscrowedDegis__factory(dev_account).deploy();
    await veDEG.initialize(degis.address, farming.address);

    await farming.setVeDEG(veDEG.address);

    income = await new IncomeSharingVault__factory(dev_account).deploy();
    await income.initialize(veDEG.address);

    await degis.mintDegis(dev_account.address, toWei("100"));
    await degis.mintDegis(user1.address, toWei("100"));
    await degis.approve(veDEG.address, toWei("100"));
    await degis.connect(user1).approve(veDEG.address, toWei("100"));
  });

  describe("Deployment", function () {
    it("should have the correct owner", async function () {
      expect(await income.owner()).to.equal(dev_account.address);
    });
  });

  describe("Owner Functions", function () {
    it("should be able to set round time", async function () {
      await expect(income.setRoundTime(86400))
        .to.emit(income, "RoundTimeChanged")
        .withArgs(0, 86400);
    });
  });

  describe("Main Functions", function () {
    beforeEach(async function () {
      // 1000 USD reward overall
      await usd.mint(income.address, stablecoinToWei("1000"));
      // 1000 shield
      await shield.mint(income.address, toWei("1000"));
    });
    it("should be able to add a new reward pool", async function () {
      await expect(income.startPool(usd.address))
        .to.emit(income, "NewRewardPoolStart")
        .withArgs(1, usd.address);

      const poolInfo = await income.pools(1);
      expect(poolInfo.rewardToken).to.equal(usd.address);
      expect(poolInfo.available).to.equal(true);
    });

    it("should not be able to stake when not start pool", async function () {
      await expect(income.deposit(1, toWei("100"))).to.be.revertedWith(
        customErrorMsg("'DIS__PoolNotAvailable()'")
      );
    });

    it("should not be able to deposit with zero amount", async function () {
      await income.startPool(usd.address);
      await expect(income.deposit(1, 0)).to.be.revertedWith(
        customErrorMsg("'DIS__ZeroAmount()'")
      );
    });

    it("should not be able to deposit with no veDEG balance", async function () {
      await income.startPool(usd.address);

      await expect(income.deposit(1, toWei("100"))).to.be.revertedWith(
        customErrorMsg("'DIS__NotEnoughVeDEG()'")
      );
    });
  });

  describe("Deposit & Redeem", function () {
    beforeEach(async function () {
      // 1000 USD reward overall
      await usd.mint(income.address, stablecoinToWei("1000"));
      // 1000 shield
      await shield.mint(income.address, toWei("1000"));

      // Deposit max time and get 100x veDEG
      await veDEG.depositMaxTime(toWei("100"));
      await veDEG.connect(user1).depositMaxTime(toWei("100"));

      // Start two pools (mock => USDC.e and Shield)
      await income.startPool(usd.address);
      await income.startPool(shield.address);

      await income.setRewardSpeed(1, stablecoinToWei("1"));
      await income.setRewardSpeed(2, toWei("1"));
    });

    it("should have correct veDEG balance", async function () {
      expect(await veDEG.balanceOf(dev_account.address)).to.equal(
        toWei("10000")
      );
      expect(await veDEG.balanceOf(user1.address)).to.equal(toWei("10000"));
    });

    it("should not be able to deposit without whitelist", async function () {
      await expect(income.deposit(1, toWei("100"))).to.be.revertedWith(
        customErrorMsg("'VED__NotWhiteListed()'")
      );

      await expect(income.deposit(2, toWei("100"))).to.be.revertedWith(
        customErrorMsg("'VED__NotWhiteListed()'")
      );

      await veDEG.addWhitelist(income.address);

      await expect(income.deposit(1, toWei("100"))).to.emit(income, "Deposit");
      await expect(income.deposit(2, toWei("100"))).to.emit(income, "Deposit");
    });

    it("should be able to deposit veDEG", async function () {
      const deposit_num = toWei("100");
      await veDEG.addWhitelist(income.address);

      // USD pool
      expect(await income.deposit(1, deposit_num))
        .to.emit(income, "Deposit")
        .withArgs(dev_account.address, 1, deposit_num);

      // Shield pool
      expect(await income.deposit(2, deposit_num))
        .to.emit(income, "Deposit")
        .withArgs(dev_account.address, 2, deposit_num);

      const usdPoolInfo = await income.pools(1);
      expect(usdPoolInfo.totalAmount).to.equal(deposit_num);
      expect(usdPoolInfo.accRewardPerShare).to.equal(0);

      const shieldPoolInfo = await income.pools(2);
      expect(shieldPoolInfo.totalAmount).to.equal(deposit_num);
      expect(shieldPoolInfo.accRewardPerShare).to.equal(0);

      const usdUserInfo = await income.users(1, dev_account.address);
      expect(usdUserInfo.totalAmount).to.equal(deposit_num);

      const shieldUserInfo = await income.users(2, dev_account.address);
      expect(shieldUserInfo.totalAmount).to.equal(deposit_num);

      // Locked amount change
      const lockedNum = await veDEG.locked(dev_account.address);
      expect(lockedNum).to.equal(toWei("200"));

      // Balance not change
      expect(await veDEG.balanceOf(dev_account.address)).to.equal(
        toWei("10000")
      );
    });

    it("should be able to withdraw veDEG", async function () {
      const deposit_num = toWei("100");
      const withdraw_num = toWei("40");
      const remain_num = toWei("60");
      await veDEG.addWhitelist(income.address);

      // USD pool
      await income.deposit(1, deposit_num);

      // Shield pool
      await income.deposit(2, deposit_num);

      expect(await income.withdraw(1, withdraw_num))
        .to.emit(income, "Withdraw")
        .withArgs(dev_account.address, 1, withdraw_num);

      expect(await income.withdraw(2, withdraw_num))
        .to.emit(income, "Withdraw")
        .withArgs(dev_account.address, 2, withdraw_num);

      const usdPoolInfo = await income.pools(1);
      expect(usdPoolInfo.totalAmount).to.equal(remain_num);
      expect(usdPoolInfo.accRewardPerShare).to.equal(
        stablecoinToWei("20000000000")
      );

      const shieldPoolInfo = await income.pools(2);
      expect(shieldPoolInfo.totalAmount).to.equal(remain_num);
      expect(shieldPoolInfo.accRewardPerShare).to.equal(toWei("20000000000"));

      const usdUserInfo = await income.users(1, dev_account.address);
      expect(usdUserInfo.totalAmount).to.equal(remain_num);

      const shieldUserInfo = await income.users(2, dev_account.address);
      expect(shieldUserInfo.totalAmount).to.equal(remain_num);

      // Locked amount change
      const lockedNum = await veDEG.locked(dev_account.address);
      expect(lockedNum).to.equal(toWei("120"));

      // Balance not change
      expect(await veDEG.balanceOf(dev_account.address)).to.equal(
        toWei("10000")
      );
    });

    it("should be able to get reward after deposit", async function () {
      const deposit_num = toWei("100");
      await veDEG.addWhitelist(income.address);

      await income.deposit(1, deposit_num);

      await mineBlocks(5);

      expect(await income.pendingReward(1, dev_account.address)).to.equal(
        stablecoinToWei("5")
      );

      await income.deposit(2, deposit_num);
      await mineBlocks(5);
      expect(await income.pendingReward(2, dev_account.address)).to.equal(
        toWei("5")
      );
    });

    it("should be able to get reward when stake / withdraw", async function () {
      const deposit_num = toWei("100");
      await veDEG.addWhitelist(income.address);

      await income.deposit(1, deposit_num);

      await income.deposit(1, deposit_num);
      // Initial balance 100001
      expect(await usd.balanceOf(dev_account.address)).to.equal(
        stablecoinToWei("100001")
      );

      await income.withdraw(1, deposit_num);
      expect(await usd.balanceOf(dev_account.address)).to.equal(
        stablecoinToWei("100002")
      );
    });

    it("should be able to get reward when stake/withdraw with multiple users", async function () {
      const deposit_num = toWei("100");
      await veDEG.addWhitelist(income.address);

      await income.deposit(1, deposit_num);

      await income.connect(user1).deposit(1, deposit_num);

      await income.deposit(1, deposit_num);
      // Initial balance 100001
      expect(await usd.balanceOf(dev_account.address)).to.equal(
        stablecoinToWei("100001.5")
      );
    });

    it("should be able to harvest reward", async function () {
      const deposit_num = toWei("100");
      await veDEG.addWhitelist(income.address);

      await income.deposit(1, deposit_num);

      await income.harvest(1, dev_account.address);
      expect(await usd.balanceOf(dev_account.address)).to.equal(
        stablecoinToWei("100001")
      );

      await income.harvest(1, dev_account.address);
      expect(await usd.balanceOf(dev_account.address)).to.equal(
        stablecoinToWei("100002")
      );
    });

    it("should be able to manually update a pool", async function () {
      const deposit_num = toWei("100");
      await veDEG.addWhitelist(income.address);

      await income.deposit(1, deposit_num);

      // accRewardPerShare = 1e6 * 1e18 / 1e20 = 1e4
      await expect(income.updatePool(1))
        .to.emit(income, "PoolUpdated")
        .withArgs(1, parseUnits("1", 16));
    });

    it("should not be able to withdraw veDEG when deposit into incomesharing", async function () {
      const deposit_num = toWei("100");
      await veDEG.addWhitelist(income.address);

      await income.deposit(1, deposit_num);

      await expect(veDEG.withdrawLocked()).to.be.revertedWith(
        customErrorMsg("'VED__StillLocked()'")
      );
    });

    it("should be able to restart the reward speed", async function () {
      const deposit_num = toWei("100");
      await veDEG.addWhitelist(income.address);

      await income.deposit(1, deposit_num);

      // 5 blocks reward
      await mineBlocks(5);

      expect(await income.pendingReward(1, dev_account.address)).to.equal(
        stablecoinToWei("5")
      );

      // 1 block reward
      await income.setRewardSpeed(1, stablecoinToWei("0"));
      await mineBlocks(5);
      expect(await income.pendingReward(1, dev_account.address)).to.equal(
        stablecoinToWei("6")
      );

      // 5 blocks reward
      await income.setRewardSpeed(1, stablecoinToWei("1"));
      await mineBlocks(5);
      expect(await income.pendingReward(1, dev_account.address)).to.equal(
        stablecoinToWei("11")
      );
    });

    it("should be able to get reward when reach max balance - part 1", async function () {
      await veDEG.addWhitelist(income.address);
      // Max usdc = 1000
      // Speed = 100
      await income.setRewardSpeed(1, stablecoinToWei("100"));

      await income.deposit(1, toWei("100")); // acc = 0
      await income.connect(user1).deposit(1, toWei("100")); // acc = 1

      await mineBlocks(5);
      expect(await income.pendingReward(1, dev_account.address)).to.equal(
        stablecoinToWei("350")
      );
      expect(await income.pendingReward(1, user1.address)).to.equal(
        stablecoinToWei("250")
      );

      await mineBlocks(5);

      // reward = 5 x 100 >
      expect(await income.pendingReward(1, dev_account.address)).to.equal(
        stablecoinToWei("600")
      );
      expect(await income.pendingReward(1, user1.address)).to.equal(
        stablecoinToWei("500")
      );

      await mineBlocks(5);
      expect(await income.pendingReward(1, dev_account.address)).to.equal(
        stablecoinToWei("600")
      );
      expect(await income.pendingReward(1, user1.address)).to.equal(
        stablecoinToWei("500")
      );

      await expect(income.withdraw(1, toWei("100")))
        .to.emit(income, "Withdraw")
        .withArgs(dev_account.address, 1, toWei("100"))
        .and.emit(income, "Harvest")
        .withArgs(dev_account.address, 1, stablecoinToWei("600"));

      await expect(income.connect(user1).withdraw(1, toWei("100")))
        .to.emit(income, "Withdraw")
        .withArgs(user1.address, 1, toWei("100"))
        .and.emit(income, "Harvest")
        .withArgs(user1.address, 1, stablecoinToWei("400"));
    });

    it("should be able to get reward when reach max balance - part 2", async function () {
      await veDEG.addWhitelist(income.address);
      // Max usdc = 1000
      // Speed = 100
      await income.setRewardSpeed(1, stablecoinToWei("100"));

      await income.deposit(1, toWei("100")); // acc = 0
      await income.connect(user1).deposit(1, toWei("100")); // acc = 1

      await mineBlocks(5);
      expect(await income.pendingReward(1, dev_account.address)).to.equal(
        stablecoinToWei("350")
      );
      expect(await income.pendingReward(1, user1.address)).to.equal(
        stablecoinToWei("250")
      );

      await mineBlocks(5);

      // reward = 5 x 100 >
      expect(await income.pendingReward(1, dev_account.address)).to.equal(
        stablecoinToWei("600")
      );
      expect(await income.pendingReward(1, user1.address)).to.equal(
        stablecoinToWei("500")
      );

      await mineBlocks(5);
      expect(await income.pendingReward(1, dev_account.address)).to.equal(
        stablecoinToWei("600")
      );
      expect(await income.pendingReward(1, user1.address)).to.equal(
        stablecoinToWei("500")
      );

      await expect(income.connect(user1).withdraw(1, toWei("100")))
        .to.emit(income, "Withdraw")
        .withArgs(user1.address, 1, toWei("100"))
        .and.emit(income, "Harvest")
        .withArgs(user1.address, 1, stablecoinToWei("500"));

      await expect(income.withdraw(1, toWei("100")))
        .to.emit(income, "Withdraw")
        .withArgs(dev_account.address, 1, toWei("100"))
        .and.emit(income, "Harvest")
        .withArgs(dev_account.address, 1, stablecoinToWei("500"));
    });

    it("should be able to deposit before setting reward speed", async function () {
      await veDEG.addWhitelist(income.address);
      // Max usdc = 1000
      // Speed = 100

      await income.setRewardSpeed(1, 0);

      await income.deposit(1, toWei("100"));
      await income.connect(user1).deposit(1, toWei("100"));

      await income.setRewardSpeed(1, stablecoinToWei("100"));

      await mineBlocks(1);

      expect(await income.pendingReward(1, dev_account.address)).to.equal(
        stablecoinToWei("50")
      );
      expect(await income.pendingReward(1, user1.address)).to.equal(
        stablecoinToWei("50")
      );
    });
  });
});
