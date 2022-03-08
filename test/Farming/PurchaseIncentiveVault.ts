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
      await expect(vault.stake(toWei("100")))
        .to.emit(vault, "Stake")
        .withArgs(dev_account.address, currentRound, toWei("100"));

      const lastRewardRoundIndex = await vault.userInfo(dev_account.address);

      expect(lastRewardRoundIndex).to.equal(0);

      const userSharesInRound = await vault.userSharesInRound(
        dev_account.address,
        currentRound
      );

      expect(userSharesInRound).to.equal(toWei("100"));

      const userPendingRounds: BigNumber[] = await vault.getUserPendingRounds(
        dev_account.address
      );
      expect(userPendingRounds.length).to.equal(1);
      expect(userPendingRounds[0]).to.equal(currentRound);
    });

    it("should be able to redeem buyer tokens", async function () {
      const currentRound = await vault.currentRound();
      await vault.stake(toWei("100"));

      await expect(vault.redeem(toWei("50")))
        .to.emit(vault, "Redeem")
        .withArgs(dev_account.address, currentRound, toWei("50"));
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

      await expect(vault.settleCurrentRound())
        .to.emit(vault, "RoundSettled")
        .withArgs(currentRound, timestamp + 1);

      expect(await vault.currentRound()).to.equal(currentRound + 1);
      expect(await vault.lastDistribution()).to.equal(timestamp + 1);
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
      await vault.settleCurrentRound();

      await vault.stake(toWei("1"));
      await vault.settleCurrentRound();
      await vault.claimOwnReward();

      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("12"));
    });

    it("should be able to claim with max round amount", async function () {
      await vault.setMaxRound(1);

      await vault.stake(toWei("1"));
      await vault.settleCurrentRound();

      await vault.stake(toWei("1"));
      await vault.claimOwnReward();
      await vault.settleCurrentRound();

      await vault.stake(toWei("1"));
      await vault.settleCurrentRound();
      await vault.claimOwnReward();

      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("8"));

      await vault.claimOwnReward();
      expect(await degis.balanceOf(dev_account.address)).to.equal(toWei("12"));
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
