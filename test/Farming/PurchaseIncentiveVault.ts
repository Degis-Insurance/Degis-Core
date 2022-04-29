import { expect } from "chai";
import { ethers } from "hardhat";
import {
  BuyerToken,
  BuyerToken__factory,
  DegisToken,
  DegisToken__factory,
  PurchaseIncentiveVault,
  PurchaseIncentiveVault__factory,
} from "../../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { customErrorMsg, getLatestBlockTimestamp, toWei } from "../utils";
import { BigNumber } from "ethers";

describe("Purcahse Incentive Vault", function () {
  let vault: PurchaseIncentiveVault;
  let DegisToken: DegisToken__factory, degis: DegisToken;
  let BuyerToken: BuyerToken__factory, buyerToken: BuyerToken;

  let dev_account: SignerWithAddress,
    user1: SignerWithAddress,
    user2: SignerWithAddress,
    policyflow: SignerWithAddress;

  let initTimestamp: number;

  beforeEach(async function () {
    [dev_account, user1, user2, policyflow] = await ethers.getSigners();

    degis = await new DegisToken__factory(dev_account).deploy();

    buyerToken = await new BuyerToken__factory(dev_account).deploy();

    vault = await new PurchaseIncentiveVault__factory(dev_account).deploy();
    await vault.initialize(buyerToken.address, degis.address);

    initTimestamp = await getLatestBlockTimestamp(ethers.provider);

    // Purchase incentive vault can mint degis tokens
    await degis.addMinter(vault.address);

    await buyerToken.mintBuyerToken(dev_account.address, toWei("1000"));
    await buyerToken.mintBuyerToken(user1.address, toWei("1000"));

    await buyerToken.approve(vault.address, toWei("1000"));
    await buyerToken.connect(user1).approve(vault.address, toWei("100000"));
  });

  describe("Deployment", function () {
    it("should have the correct owner", async function () {
      expect(await vault.owner()).to.equal(dev_account.address);
    });

    it("should have the correct initial currentRound", async function () {
      expect(await vault.currentRound()).to.equal(0);
    });

    it("should have the correct initial degisPerRound", async function () {
      expect(await vault.degisPerRound()).to.equal(0);
    });

    it("should have the correct initial MAX_ROUND", async function () {
      expect(await vault.MAX_ROUND()).to.equal(50);
    });

    it("should set the lastDistribution correctly", async function () {
      expect(await vault.lastDistribution()).to.equal(initTimestamp);
    });

    it("should be unpaused at the beginning", async function () {
      expect(await vault.paused()).to.equal(false);
    });
  });

  describe("Owner Functions", function () {
    it("should be able to set degis per round", async function () {
      await expect(vault.setDegisPerRound(toWei("1")))
        .to.emit(vault, "DegisRewardChanged")
        .withArgs(0, toWei("1"));
    });

    it("should be able to set distribution interval", async function () {
      await expect(vault.setDistributionInterval(20))
        .to.emit(vault, "DistributionIntervalChanged")
        .withArgs(0, 20);
    });

    it("should be able to pause the contract", async function () {
      await vault.pause();
      expect(await vault.paused()).to.equal(true);
    });

    it("should be able to unpause the contract", async function () {
      await vault.pause();
      await vault.unpause();
      expect(await vault.paused()).to.equal(false);
    });

    it("should be able to set the piecewise reward", async function () {
      let threshold = [toWei("1"), toWei("2"), toWei("3")];
      let reward = [toWei("1"), toWei("2"), toWei("3")];
      await vault.setPiecewise(threshold, reward);
    });
  });

  describe("Stake and Redeem", function () {
    it("should be able to stake buyer tokens", async function () {
      const currentRound = await vault.currentRound();

      // Check the stake event
      await expect(vault.stake(toWei("100")))
        .to.emit(vault, "Stake")
        .withArgs(dev_account.address, currentRound, toWei("100"));

      // Last reward round index (inside pendingRounds)
      const lastRewardRoundIndex = await vault.users(dev_account.address);
      expect(lastRewardRoundIndex).to.equal(0);

      // User shares in round
      const userSharesInRound = await vault.userSharesInRound(
        dev_account.address,
        currentRound
      );
      expect(userSharesInRound).to.equal(toWei("100"));

      // User's pending rounds
      const userPendingRounds: BigNumber[] = await vault.getUserPendingRounds(
        dev_account.address
      );
      expect(userPendingRounds.length).to.equal(1);
      expect(userPendingRounds[0]).to.equal(currentRound);

      // Round info
      const roundInfo = await vault.rounds(currentRound);
      expect(roundInfo.shares).to.equal(toWei("100"));
      expect(roundInfo.degisPerShare).to.equal(0);
      expect(roundInfo.hasDistributed).to.equal(false);

      // Users in this round
      const usersInRound = await vault.getUsersInRound(currentRound);
      expect(usersInRound.length).to.equal(1);
      expect(usersInRound[0]).to.equal(dev_account.address);
    });

    it("should not be able to stake with zero amount", async function () {
      await expect(vault.stake(0)).to.be.revertedWith(
        customErrorMsg("'PIV__ZeroAmount()'")
      );

      await expect(vault.connect(user1).stake(0)).to.be.revertedWith(
        customErrorMsg("'PIV__ZeroAmount()'")
      );
    });

    it("should be able to stake buyer tokens for multiple times", async function () {
      const currentRound = await vault.currentRound();

      await vault.stake(toWei("100"));
      await vault.stake(toWei("100"));

      const lastRewardRoundIndex = await vault.users(dev_account.address);
      expect(lastRewardRoundIndex).to.equal(0);

      expect(
        await vault.userSharesInRound(dev_account.address, currentRound)
      ).to.equal(toWei("200"));

      const userPendingRounds: BigNumber[] = await vault.getUserPendingRounds(
        dev_account.address
      );
      expect(userPendingRounds.length).to.equal(1);
      expect(userPendingRounds[0]).to.equal(currentRound);

      // Round info
      const roundInfo = await vault.rounds(currentRound);
      expect(roundInfo.shares).to.equal(toWei("200"));
      expect(roundInfo.degisPerShare).to.equal(0);
      expect(roundInfo.hasDistributed).to.equal(false);

      // Users in this round
      const usersInRound = await vault.getUsersInRound(currentRound);
      expect(usersInRound.length).to.equal(1);
      expect(usersInRound[0]).to.equal(dev_account.address);
    });

    it("should be able to stake buyer tokens by different users", async function () {
      const currentRound = await vault.currentRound();

      await vault.stake(toWei("100"));
      await vault.connect(user1).stake(toWei("100"));

      // Last reward round index
      // No claim before, should be 0
      // For dev_account
      const lastRewardRoundIndex_dev = await vault.users(dev_account.address);
      expect(lastRewardRoundIndex_dev).to.equal(0);

      // For user1
      const lastRewardRoundIndex_user1 = await vault.users(user1.address);
      expect(lastRewardRoundIndex_user1).to.equal(0);

      // Correct user shares
      expect(
        await vault.userSharesInRound(dev_account.address, currentRound)
      ).to.equal(toWei("100"));
      expect(
        await vault.userSharesInRound(user1.address, currentRound)
      ).to.equal(toWei("100"));

      // Correct user pending rounds
      const userPendingRounds_dev: BigNumber[] =
        await vault.getUserPendingRounds(dev_account.address);
      expect(userPendingRounds_dev.length).to.equal(1);
      expect(userPendingRounds_dev[0]).to.equal(currentRound);

      const userPendingRounds_user1: BigNumber[] =
        await vault.getUserPendingRounds(dev_account.address);
      expect(userPendingRounds_user1.length).to.equal(1);
      expect(userPendingRounds_user1[0]).to.equal(currentRound);

      // Round info
      const roundInfo = await vault.rounds(currentRound);
      expect(roundInfo.shares).to.equal(toWei("200"));
      expect(roundInfo.degisPerShare).to.equal(0);
      expect(roundInfo.hasDistributed).to.equal(false);

      // Users in this round
      const usersInRound = await vault.getUsersInRound(currentRound);
      expect(usersInRound.length).to.equal(2);
      expect(usersInRound[0]).to.equal(dev_account.address);
      expect(usersInRound[1]).to.equal(user1.address);
    });

    it("should be able to redeem buyer tokens", async function () {
      const currentRound = await vault.currentRound();
      await vault.stake(toWei("100"));

      await expect(vault.redeem(toWei("100")))
        .to.emit(vault, "Redeem")
        .withArgs(dev_account.address, currentRound, toWei("100"));

      // Initial mint: 1000
      // Stake: 100 Redeem: 100
      expect(await buyerToken.balanceOf(dev_account.address)).to.equal(
        toWei("1000")
      );

      await expect(vault.redeem(toWei("500"))).to.be.revertedWith(
        customErrorMsg("'PIV__NotEnoughBuyerTokens()'")
      );

      const userPendingRounds: BigNumber[] = await vault.getUserPendingRounds(
        dev_account.address
      );
      expect(userPendingRounds.length).to.equal(0);

      // Round info
      const roundInfo = await vault.rounds(currentRound);
      expect(roundInfo.shares).to.equal(0);
      expect(roundInfo.degisPerShare).to.equal(0);
      expect(roundInfo.hasDistributed).to.equal(false);

      // Users in this round
      // The user address will not be deleted even if the user has no shares
      const usersInRound = await vault.getUsersInRound(currentRound);
      expect(usersInRound.length).to.equal(1);
      expect(usersInRound[0]).to.equal(dev_account.address);
    });

    it("should not be able to redeem with zero amount", async function () {
      await vault.stake(toWei("100"));

      await expect(vault.redeem(0)).to.be.revertedWith(
        customErrorMsg("'PIV__ZeroAmount()'")
      );
    });

    it("should be able to redeem buyer tokens for multiple times", async function () {
      const currentRound = await vault.currentRound();
      await vault.stake(toWei("100"));

      await expect(vault.redeem(toWei("50")))
        .to.emit(vault, "Redeem")
        .withArgs(dev_account.address, currentRound, toWei("50"));

      // Initial mint: 1000
      // Stake: 100 Redeem: 50
      expect(await buyerToken.balanceOf(dev_account.address)).to.equal(
        toWei("950")
      );

      // Redeem 500 is not possible
      await expect(vault.redeem(toWei("500"))).to.be.revertedWith(
        customErrorMsg("'PIV__NotEnoughBuyerTokens()'")
      );

      const userPendingRounds: BigNumber[] = await vault.getUserPendingRounds(
        dev_account.address
      );
      expect(userPendingRounds.length).to.equal(1);
      expect(userPendingRounds[0]).to.equal(currentRound);

      await vault.redeem(toWei("50"));

      // After redeeming all tokens in current round, the pending round should be poped
      const userPendingRounds_after: BigNumber[] =
        await vault.getUserPendingRounds(dev_account.address);
      expect(userPendingRounds_after.length).to.equal(0);
    });
  });

  describe("Settle the Reward", function () {
    let degisPerRound = toWei("4");
    let distributionInterval = 1;

    beforeEach(async function () {
      await vault.setDegisPerRound(degisPerRound);
      await vault.setDistributionInterval(distributionInterval);
    });

    it("should be able to settle correctly", async function () {
      await vault.stake(toWei("1"));
      await vault.connect(user1).stake(toWei("3"));

      const timestamp = await getLatestBlockTimestamp(ethers.provider);

      const currentRound = (await vault.currentRound()).toNumber();

      // Each block, timestamp + 1
      await expect(vault.settleCurrentRound())
        .to.emit(vault, "RoundSettled")
        .withArgs(currentRound, timestamp + 1);

      expect(await vault.currentRound()).to.equal(currentRound + 1);
      expect(await vault.lastDistribution()).to.equal(timestamp + 1);

      const roundInfo = await vault.rounds(currentRound);
      expect(roundInfo.shares).to.equal(toWei("4"));
      expect(roundInfo.hasDistributed).to.equal(true);
      expect(roundInfo.degisPerShare).to.equal(toWei("1"));

      const lastRewardRoundIndex_dev = await vault.users(dev_account.address);
      expect(lastRewardRoundIndex_dev).to.equal(0);
      const lastRewardRoundIndex_user1 = await vault.users(dev_account.address);
      expect(lastRewardRoundIndex_user1).to.equal(0);
    });

    it("should be able to settle when no reward", async function () {
      // Set reward per round to 0
      await vault.setDegisPerRound(0);

      await vault.stake(toWei("1"));
      await vault.connect(user1).stake(toWei("3"));

      const timestamp = await getLatestBlockTimestamp(ethers.provider);

      const currentRound = (await vault.currentRound()).toNumber();

      // Each block, timestamp + 1
      await expect(vault.settleCurrentRound())
        .to.emit(vault, "RoundSettled")
        .withArgs(currentRound, timestamp + 1);

      expect(await vault.currentRound()).to.equal(currentRound + 1);
      expect(await vault.lastDistribution()).to.equal(timestamp + 1);

      const roundInfo = await vault.rounds(currentRound);

      expect(roundInfo.shares).to.equal(toWei("4"));
      expect(roundInfo.hasDistributed).to.equal(true);
      expect(roundInfo.degisPerShare).to.equal(toWei("0"));
    });

    it("should be able to settle after several stake&redeem", async function () {
      await vault.stake(toWei("1"));
      await vault.stake(toWei("1"));

      await vault.redeem(toWei("1"));

      await vault.stake(toWei("1"));

      const currentRound = (await vault.currentRound()).toNumber();

      await expect(vault.settleCurrentRound()).to.emit(vault, "RoundSettled");
      expect(await vault.currentRound()).to.equal(currentRound + 1);
    });

    it("should not be able to settle before passing the interval", async function () {
      await vault.settleCurrentRound();
      await expect(vault.settleCurrentRound()).to.be.revertedWith(
        customErrorMsg("'PIV__NotPassedInterval()'")
      );

      await vault.stake(toWei("1"));
      await vault.settleCurrentRound();
      await expect(vault.settleCurrentRound()).to.be.revertedWith(
        customErrorMsg("'PIV__NotPassedInterval()'")
      );
    });

    it("should be able to claim reward by user himself", async function () {
      // Two users deposit
      await vault.stake(toWei("1"));
      await vault.connect(user1).stake(toWei("3"));

      // Settlement
      await vault.settleCurrentRound();

      // Two users claim their reward
      await vault.claim();
      await vault.connect(user1).claim();

      // Check balance
      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("1"));
      expect(await degis.balanceOf(user1.address)).to.equal(toWei("3"));
    });

    it("should not be able to repeat claiming after a claim", async function () {
      await vault.stake(toWei("1"));
      await vault.settleCurrentRound();

      await vault.claim();

      await expect(vault.claim()).to.be.revertedWith(
        customErrorMsg("'PIV__ClaimedAll()'")
      );
    });

    it("should be able to claim by user himself when he stake in current round", async function () {
      await vault.stake(toWei("1"));
      await vault.settleCurrentRound();

      await vault.stake(toWei("1"));
      await vault.claim();

      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("4"));

      await vault.settleCurrentRound();

      await vault.stake(toWei("1"));
      await vault.settleCurrentRound();
      await vault.claim();

      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("12"));
    });

    it("should be able to claim with max round amount", async function () {
      // MAX_ROUND = 50
      const maxRound = (await vault.MAX_ROUND()).toNumber();
      for (let i = 0; i < maxRound; i++) {
        // Stake and settle
        await vault.stake(toWei("1"));
        await vault.settleCurrentRound();
      }

      // MAX_ROUND + 1
      await vault.stake(toWei("1"));
      await vault.settleCurrentRound();

      // Get 50 round rewards
      await vault.claim();
      expect(await degis.balanceOf(dev_account.address)).to.equal(
        toWei((maxRound * 4).toString())
      );

      await vault.stake(toWei("1"));
      await vault.settleCurrentRound();

      // Another 2 rounds
      await vault.claim();
      expect(await degis.balanceOf(dev_account.address)).to.equal(
        toWei(((maxRound+2) * 4 ).toString())
      );
    });

    it("should be able to claim by user himself after several rounds - all", async function () {
      const times = 20;
      for (let i = 0; i < times; i++) {
        await vault.stake(toWei("1"));
        await vault.connect(user1).stake(toWei("3"));
        await vault.settleCurrentRound();
      }

      await vault.claim();
      await vault.connect(user1).claim();

      // Check balance
      expect(await degis.balanceOf(dev_account.address)).to.equal(
        toWei(times.toString())
      );
      expect(await degis.balanceOf(user1.address)).to.equal(
        toWei((3 * times).toString())
      );

      // last reward round index
      expect(await vault.users(dev_account.address)).to.equal(times);
      expect(await vault.users(user1.address)).to.equal(times);

      for (let i = 0; i < times; i++) {
        await vault.stake(toWei("1"));
        await vault.connect(user1).stake(toWei("3"));
        await vault.settleCurrentRound();
      }
      await vault.claim();
      await vault.connect(user1).claim();

      expect(await degis.balanceOf(dev_account.address)).to.equal(
        toWei((times * 2).toString())
      );
      expect(await degis.balanceOf(user1.address)).to.equal(
        toWei((6 * times).toString())
      );

      await expect(vault.claim()).to.be.revertedWith(
        customErrorMsg("'PIV__ClaimedAll()'")
      );
      await expect(vault.connect(user1).claim()).to.be.revertedWith(
        customErrorMsg("'PIV__ClaimedAll()'")
      );
    });

    it("should be able to claim by user himself after several rounds - part", async function () {
      const times = 4;
      for (let i = 0; i < times; i++) {
        await vault.stake(toWei("1"));
        if (i % 2 == 0) {
          await vault.connect(user1).stake(toWei("3"));
        }
        await vault.settleCurrentRound();
      }

      await vault.claim();
      await vault.connect(user1).claim();

      // Check reward balance
      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("10"));
      expect(await degis.balanceOf(user1.address)).to.equal(toWei("6"));

      // Check last reward round index
      expect(await vault.users(dev_account.address)).to.equal(4);
      expect(await vault.users(user1.address)).to.equal(2);

      // Check the pending rounds record
      const pendingRounds_dev = await vault.getUserPendingRounds(
        dev_account.address
      );
      const pendingRounds_user1 = await vault.getUserPendingRounds(
        user1.address
      );
      expect(pendingRounds_dev.length).to.equal(4);
      expect(pendingRounds_user1.length).to.equal(2);

      expect(pendingRounds_dev[0]).to.equal(0);
      expect(pendingRounds_dev[1]).to.equal(1);
      expect(pendingRounds_dev[2]).to.equal(2);
      expect(pendingRounds_dev[3]).to.equal(3);

      expect(pendingRounds_user1[0]).to.equal(0);
      expect(pendingRounds_user1[1]).to.equal(2);

      await expect(vault.claim()).to.be.revertedWith(
        customErrorMsg("'PIV__ClaimedAll()'")
      );

      await expect(vault.connect(user1).claim()).to.be.revertedWith(
        customErrorMsg("'PIV__ClaimedAll()'")
      );
    });

    it("should be able to check the pending reward", async function () {
      const times = 20;
      for (let i = 0; i < times; i++) {
        await vault.stake(toWei("1"));
        await vault.connect(user1).stake(toWei("3"));
        await vault.settleCurrentRound();
      }
      expect(await vault.pendingReward(dev_account.address)).to.equal(
        toWei(times.toString())
      );
      expect(await vault.pendingReward(user1.address)).to.equal(
        toWei((3 * times).toString())
      );
    });
  });

  describe("Pause and Unpause", function () {
    let degisPerRound = toWei("4");
    let distributionInterval = 1;

    it("should be able to pause the contract", async function () {
      await expect(vault.pause())
        .to.emit(vault, "Paused")
        .withArgs(dev_account.address);

      await expect(vault.stake(toWei("1"))).to.be.revertedWith(
        "Pausable: paused"
      );

      await expect(vault.redeem(toWei("1"))).to.be.revertedWith(
        "Pausable: paused"
      );

      await expect(vault.claim()).to.be.revertedWith("Pausable: paused");

      await expect(vault.settleCurrentRound()).to.be.revertedWith(
        "Pausable: paused"
      );
    });
  });

  describe("Piecewise", function () {
    let distributionInterval = 1;
    let degisPerRound = toWei("2");

    beforeEach(async function () {
      await vault.setDegisPerRound(degisPerRound);
      await vault.setDistributionInterval(distributionInterval);

      const threshold = [0, toWei("10"), toWei("100")];
      const piecewise = [toWei("4"), toWei("8"), toWei("12")];

      await vault.setPiecewise(threshold, piecewise);
    });

    it("should be able to get piecewise reward correctly", async function () {
      // 0 - 10: 4
      expect(await vault.getRewardPerRound()).to.equal(toWei("4"));

      // 0 < 5 < 10: 4
      await vault.stake(toWei("5"));
      expect(await vault.getRewardPerRound()).to.equal(toWei("4"));

      // 10 <= 10 < 100: 8
      await vault.stake(toWei("5"));
      expect(await vault.getRewardPerRound()).to.equal(toWei("8"));

      // 100 <= 100 < MAX: 12
      await vault.stake(toWei("90"));
      expect(await vault.getRewardPerRound()).to.equal(toWei("12"));

      // 100 < 700 < MAX: 12
      await vault.stake(toWei("600"));
      expect(await vault.getRewardPerRound()).to.equal(toWei("12"));
    });

    it("should be able to settle with piecewise reward", async function () {
      let timestamp, currentRound;
      //
      // Level 1 -------------------
      //
      await vault.stake(toWei("1"));
      await vault.connect(user1).stake(toWei("3"));

      timestamp = await getLatestBlockTimestamp(ethers.provider);
      currentRound = (await vault.currentRound()).toNumber();

      // Each block, timestamp + 1
      await expect(vault.settleCurrentRound())
        .to.emit(vault, "RoundSettled")
        .withArgs(currentRound, timestamp + 1);

      expect(await vault.currentRound()).to.equal(currentRound + 1);
      expect(await vault.lastDistribution()).to.equal(timestamp + 1);

      const roundInfo = await vault.rounds(currentRound);
      expect(roundInfo.shares).to.equal(toWei("4"));
      expect(roundInfo.hasDistributed).to.equal(true);
      expect(roundInfo.degisPerShare).to.equal(toWei("1"));

      // Last reward round index
      expect(await vault.users(dev_account.address)).to.equal(0);
      expect(await vault.users(user1.address)).to.equal(0);

      //
      // Level 2 -------------------
      //
      await vault.stake(toWei("4"));
      await vault.connect(user1).stake(toWei("12"));
      timestamp = await getLatestBlockTimestamp(ethers.provider);

      currentRound = (await vault.currentRound()).toNumber();

      // Each block, timestamp + 1
      await expect(vault.settleCurrentRound())
        .to.emit(vault, "RoundSettled")
        .withArgs(currentRound, timestamp + 1);

      expect(await vault.currentRound()).to.equal(currentRound + 1);
      expect(await vault.lastDistribution()).to.equal(timestamp + 1);

      const roundInfo_level2 = await vault.rounds(currentRound);
      expect(roundInfo_level2.shares).to.equal(toWei("16"));
      expect(roundInfo_level2.hasDistributed).to.equal(true);
      expect(roundInfo_level2.degisPerShare).to.equal(toWei("0.5"));

      // Last reward round index
      expect(await vault.users(dev_account.address)).to.equal(0);
      expect(await vault.users(user1.address)).to.equal(0);

      //
      // Level 3 -------------------
      //
      await vault.stake(toWei("40"));
      await vault.connect(user1).stake(toWei("120"));
      timestamp = await getLatestBlockTimestamp(ethers.provider);

      currentRound = (await vault.currentRound()).toNumber();

      // Each block, timestamp + 1
      await expect(vault.settleCurrentRound())
        .to.emit(vault, "RoundSettled")
        .withArgs(currentRound, timestamp + 1);

      expect(await vault.currentRound()).to.equal(currentRound + 1);
      expect(await vault.lastDistribution()).to.equal(timestamp + 1);

      const roundInfo_level3 = await vault.rounds(currentRound);
      expect(roundInfo_level3.shares).to.equal(toWei("160"));
      expect(roundInfo_level3.hasDistributed).to.equal(true);
      expect(roundInfo_level3.degisPerShare).to.equal(toWei("0.075"));

      // Last reward round index
      expect(await vault.users(dev_account.address)).to.equal(0);
      expect(await vault.users(user1.address)).to.equal(0);
    });

    it("should be able to claim reward with piecewise", async function () {
      //
      // Level 1 -------------------
      //
      await vault.stake(toWei("1"));
      await vault.connect(user1).stake(toWei("3"));

      // Settlement
      await vault.settleCurrentRound();

      // Two users claim their reward
      await vault.claim();
      await vault.connect(user1).claim();

      // Check balance
      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("1"));
      expect(await degis.balanceOf(user1.address)).to.equal(toWei("3"));

      expect(await vault.users(dev_account.address)).to.equal(1);
      expect(await vault.users(user1.address)).to.equal(1);

      //
      // Level 2 -------------------
      //
      await vault.stake(toWei("4"));
      await vault.connect(user1).stake(toWei("12"));

      // Settlement
      await vault.settleCurrentRound();

      // Two users claim their reward
      await vault.claim();
      await vault.connect(user1).claim();

      // Check balance
      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("3"));
      expect(await degis.balanceOf(user1.address)).to.equal(toWei("9"));

      expect(await vault.users(dev_account.address)).to.equal(2);
      expect(await vault.users(user1.address)).to.equal(2);

      //
      // Level 3 -------------------
      //
      await vault.stake(toWei("30"));
      await vault.connect(user1).stake(toWei("90"));

      // Settlement
      await vault.settleCurrentRound();

      // Two users claim their reward
      await vault.claim();
      await vault.connect(user1).claim();

      // Check balance
      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("6"));
      expect(await degis.balanceOf(user1.address)).to.equal(toWei("18"));

      expect(await vault.users(dev_account.address)).to.equal(3);
      expect(await vault.users(user1.address)).to.equal(3);
    });

    it("should be able to settle without setting piecewise", async function () {
      const threshold: any = [];
      const piecewise: any = [];

      await vault.setPiecewise(threshold, piecewise);

      // Use default reward per round
      expect(await vault.getRewardPerRound()).to.equal(toWei("2"));

      await vault.stake(toWei("1"));
      await vault.connect(user1).stake(toWei("1"));
      const currentRound = await vault.currentRound();

      await vault.settleCurrentRound();

      const roundInfo = await vault.rounds(currentRound);
      expect(roundInfo.shares).to.equal(toWei("2"));
      expect(roundInfo.hasDistributed).to.equal(true);
      expect(roundInfo.degisPerShare).to.equal(toWei("1"));
    });

    it("should be able to claim reward with piecewise", async function () {
      // Level 1 reward
      // Stake
      await vault.stake(toWei("1"));
      await vault.connect(user1).stake(toWei("1"));

      // Settle
      await vault.settleCurrentRound();

      // Claim
      await vault.claim();
      await vault.connect(user1).claim();

      // Check level 1 reward
      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("2"));
      expect(await degis.balanceOf(user1.address)).to.equal(toWei("2"));

      // Level 2
      // Stake
      await vault.stake(toWei("20"));
      await vault.connect(user1).stake(toWei("20"));

      // Settle
      await vault.settleCurrentRound();

      // Claim
      await vault.claim();
      await vault.connect(user1).claim();

      // Check level 2 reward
      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("6"));
      expect(await degis.balanceOf(user1.address)).to.equal(toWei("6"));

      // Level 3
      // Stake
      await vault.stake(toWei("100"));
      await vault.connect(user1).stake(toWei("100"));

      // Settle
      await vault.settleCurrentRound();

      // Claim
      await vault.claim();
      await vault.connect(user1).claim();

      // Check level 3 reward
      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("12"));
      expect(await degis.balanceOf(user1.address)).to.equal(toWei("12"));
    });
  });
});
