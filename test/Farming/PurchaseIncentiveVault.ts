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
import { getLatestBlockTimestamp, toWei } from "../utils";
import { BigNumber } from "ethers";

describe("Purcahse Incentive Vault", function () {
  let PurchaseIncentiveVault: PurchaseIncentiveVault__factory,
    vault: PurchaseIncentiveVault;
  let DegisToken: DegisToken__factory, degis: DegisToken;
  let BuyerToken: BuyerToken__factory, buyerToken: BuyerToken;

  let dev_account: SignerWithAddress,
    user1: SignerWithAddress,
    user2: SignerWithAddress,
    policyflow: SignerWithAddress;

  let initBlockNumber: number, initTimestamp: number;

  beforeEach(async function () {
    [dev_account, user1, user2, policyflow] = await ethers.getSigners();

    DegisToken = await ethers.getContractFactory("DegisToken");
    degis = await DegisToken.deploy();

    BuyerToken = await ethers.getContractFactory("BuyerToken");
    buyerToken = await BuyerToken.deploy();

    PurchaseIncentiveVault = await ethers.getContractFactory(
      "PurchaseIncentiveVault"
    );
    vault = await PurchaseIncentiveVault.deploy(
      buyerToken.address,
      degis.address
    );
    initTimestamp = await getLatestBlockTimestamp(ethers.provider);
    initBlockNumber = await ethers.provider.getBlockNumber();

    await vault.deployed();

    // Purchase incentive vault can burn buyer tokens and mint degis tokens
    await buyerToken.addBurner(vault.address);
    await degis.addMinter(vault.address);

    await buyerToken.mintBuyerToken(dev_account.address, toWei("1000"));
    await buyerToken.mintBuyerToken(user1.address, toWei("1000"));

    await buyerToken.approve(vault.address, toWei("100000"));
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

    it("should be able to set max round", async function () {
      await expect(vault.setMaxRound(20))
        .to.emit(vault, "MaxRoundChanged")
        .withArgs(50, 20);
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
      const lastRewardRoundIndex = await vault.userInfo(dev_account.address);
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
      const roundInfo = await vault.roundInfo(currentRound);
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
        "Amount must be greater than 0"
      );

      await expect(vault.connect(user1).stake(0)).to.be.revertedWith(
        "Amount must be greater than 0"
      );
    });

    it("should be able to stake buyer tokens for multiple times", async function () {
      const currentRound = await vault.currentRound();

      await vault.stake(toWei("100"));
      await vault.stake(toWei("100"));

      const lastRewardRoundIndex = await vault.userInfo(dev_account.address);
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
      const roundInfo = await vault.roundInfo(currentRound);
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
      const lastRewardRoundIndex_dev = await vault.userInfo(
        dev_account.address
      );
      expect(lastRewardRoundIndex_dev).to.equal(0);
      const lastRewardRoundIndex_user1 = await vault.userInfo(user1.address);
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
      const roundInfo = await vault.roundInfo(currentRound);
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
        "Not enough buyer tokens for you to redeem"
      );

      const userPendingRounds: BigNumber[] = await vault.getUserPendingRounds(
        dev_account.address
      );
      expect(userPendingRounds.length).to.equal(0);

      // Round info
      const roundInfo = await vault.roundInfo(currentRound);
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
        "Amount must be greater than 0"
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
        "Not enough buyer tokens for you to redeem"
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
      const blockNumber = await ethers.provider.getBlockNumber();

      const timestamp = await getLatestBlockTimestamp(ethers.provider);

      const currentRound = (await vault.currentRound()).toNumber();

      // Each block, timestamp + 1
      await expect(vault.settleCurrentRound())
        .to.emit(vault, "RoundSettled")
        .withArgs(currentRound, timestamp + 1);

      expect(await vault.currentRound()).to.equal(currentRound + 1);
      expect(await vault.lastDistribution()).to.equal(timestamp + 1);

      const roundInfo = await vault.roundInfo(currentRound);
      expect(roundInfo.shares).to.equal(toWei("4"));
      expect(roundInfo.hasDistributed).to.equal(true);
      expect(roundInfo.degisPerShare).to.equal(toWei("1"));

      const lastRewardRoundIndex_dev = await vault.userInfo(
        dev_account.address
      );
      expect(lastRewardRoundIndex_dev).to.equal(0);
      const lastRewardRoundIndex_user1 = await vault.userInfo(
        dev_account.address
      );
      expect(lastRewardRoundIndex_user1).to.equal(0);
    });

    it("should be able to settle when no reward", async function () {
      // Set reward per round to 0
      await vault.setDegisPerRound(0);

      await vault.stake(toWei("1"));
      await vault.connect(user1).stake(toWei("3"));
      const blockNumber = await ethers.provider.getBlockNumber();

      const timestamp = await getLatestBlockTimestamp(ethers.provider);

      const currentRound = (await vault.currentRound()).toNumber();

      // Each block, timestamp + 1
      await expect(vault.settleCurrentRound())
        .to.emit(vault, "RoundSettled")
        .withArgs(currentRound, timestamp + 1);

      expect(await vault.currentRound()).to.equal(currentRound + 1);
      expect(await vault.lastDistribution()).to.equal(timestamp + 1);

      const roundInfo = await vault.roundInfo(currentRound);

      expect(roundInfo.shares).to.equal(toWei("4"));
      expect(roundInfo.hasDistributed).to.equal(true);
      expect(roundInfo.degisPerShare).to.equal(toWei("0"));
    });

    it("should be able to settle after several stake&redeem", async function () {
      await vault.stake(toWei("1"));
      await vault.stake(toWei("1"));

      await vault.redeem(toWei("1"));

      await vault.stake(toWei("1"));

      await expect(vault.settleCurrentRound()).to.emit(vault, "RoundSettled");
    });

    it("should not be able to settle before passing the interval", async function () {
      await vault.settleCurrentRound();
      await expect(vault.settleCurrentRound()).to.be.revertedWith(
        "Two distributions should have an interval"
      );
    });

    it("should be able to claim reward by user himself", async function () {
      await vault.stake(toWei("1"));
      await vault.connect(user1).stake(toWei("3"));
      await vault.settleCurrentRound();

      await vault.claimOwnReward();
      await vault.connect(user1).claimOwnReward();

      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("1"));
      expect(await degis.balanceOf(user1.address)).to.equal(toWei("3"));
    });

    it("should not be able to repeat claiming after a claim", async function () {
      await vault.stake(toWei("1"));
      await vault.settleCurrentRound();

      await vault.claimOwnReward();

      await expect(vault.claimOwnReward()).to.be.revertedWith(
        "Have claimed all"
      );
    });

    it("should be able to claim by user himself when he stake in current round", async function () {
      await vault.stake(toWei("1"));
      await vault.settleCurrentRound();

      await vault.stake(toWei("1"));
      await vault.claimOwnReward();

      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("4"));

      await vault.settleCurrentRound();

      await vault.stake(toWei("1"));
      await vault.settleCurrentRound();
      await vault.claimOwnReward();

      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("12"));
    });

    it("should be able to claim with max round amount", async function () {
      await vault.setMaxRound(2);

      await vault.stake(toWei("1"));
      await vault.settleCurrentRound();

      await vault.stake(toWei("1"));

      await vault.claimOwnReward();
      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("4"));

      await vault.settleCurrentRound();

      await vault.stake(toWei("1"));
      await vault.settleCurrentRound();

      await vault.stake(toWei("1"));
      await vault.settleCurrentRound();

      // Max Round = 2, This time only claim rewards of 2 rounds(8)
      await vault.claimOwnReward();
      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("12"));

      // Claim the remaining rewards(4)
      await vault.claimOwnReward();
      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("16"));
    });

    it("should be able to claim by user himself after several rounds - all", async function () {
      const times = 20;
      for (let i = 0; i < times; i++) {
        await vault.stake(toWei("1"));
        await vault.connect(user1).stake(toWei("3"));
        await vault.settleCurrentRound();
      }

      await vault.claimOwnReward();
      await vault.connect(user1).claimOwnReward();

      expect(await degis.balanceOf(dev_account.address)).to.equal(
        toWei(times.toString())
      );
      expect(await degis.balanceOf(user1.address)).to.equal(
        toWei((3 * times).toString())
      );

      for (let i = 0; i < times; i++) {
        await vault.stake(toWei("1"));
        await vault.connect(user1).stake(toWei("3"));
        await vault.settleCurrentRound();
      }
      await vault.claimOwnReward();
      await vault.connect(user1).claimOwnReward();

      expect(await degis.balanceOf(dev_account.address)).to.equal(
        toWei((times * 2).toString())
      );
      expect(await degis.balanceOf(user1.address)).to.equal(
        toWei((6 * times).toString())
      );

      await expect(vault.claimOwnReward()).to.be.revertedWith(
        "Have claimed all"
      );
      await expect(vault.connect(user1).claimOwnReward()).to.be.revertedWith(
        "Have claimed all"
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

      await vault.claimOwnReward();
      await vault.connect(user1).claimOwnReward();

      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("10"));
      expect(await degis.balanceOf(user1.address)).to.equal(toWei("6"));

      await expect(vault.claimOwnReward()).to.be.revertedWith(
        "Have claimed all"
      );

      await expect(vault.connect(user1).claimOwnReward()).to.be.revertedWith(
        "Have claimed all"
      );
    });

    it("should be able to check the pending reward", async function () {
      const times = 20;
      for (let i = 0; i < times; i++) {
        await vault.stake(toWei("1"));
        await vault.connect(user1).stake(toWei("3"));
        await vault.settleCurrentRound();
      }
      expect(await vault.pendingReward()).to.equal(toWei(times.toString()));
      expect(await vault.connect(user1).pendingReward()).to.equal(
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

      await expect(vault.claimOwnReward()).to.be.revertedWith(
        "Pausable: paused"
      );

      await expect(vault.settleCurrentRound()).to.be.revertedWith(
        "Pausable: paused"
      );
    });
  });
});
