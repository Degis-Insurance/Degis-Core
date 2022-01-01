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
import { parseEther, parseUnits } from "ethers/lib/utils";
import { timeStamp } from "console";

describe("Purcahse Incentive Vault", function () {
  let PurchaseIncentiveVault: PurchaseIncentiveVault__factory,
    vault: PurchaseIncentiveVault;
  let DegisToken: DegisToken__factory, degis: DegisToken;
  let BuyerToken: BuyerToken__factory, buyerToken: BuyerToken;

  let dev_account: SignerWithAddress,
    user1: SignerWithAddress,
    user2: SignerWithAddress,
    policyflow: SignerWithAddress;

  let currentRound: number, initBlockNumber: number;

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
    initBlockNumber = await ethers.provider.getBlockNumber();

    await vault.deployed();

    await buyerToken.addBurner(vault.address);
    await degis.addMinter(vault.address);

    await buyerToken.mintBuyerToken(dev_account.address, parseUnits("1000"));
    await buyerToken.mintBuyerToken(user1.address, parseUnits("1000"));

    await buyerToken.approve(vault.address, parseUnits("100000"));
    await buyerToken
      .connect(user1)
      .approve(vault.address, parseUnits("100000"));
    currentRound = (await vault.currentRound()).toNumber();
  });

  describe("Deployment", function () {
    it("should have the correct owner", async function () {
      expect(await vault.owner()).to.equal(dev_account.address);
    });

    it("should set the lastDistributionBlock correctly", async function () {
      expect(await vault.lastDistributionBlock()).to.equal(initBlockNumber);
    });
  });

  describe("Owner Functions", function () {});

  describe("Stake and Redeem", function () {
    it("should be able to stake buyer tokens", async function () {
      const currentRound = await vault.currentRound();
      await expect(vault.stake(parseUnits("100")))
        .to.emit(vault, "Stake")
        .withArgs(dev_account.address, currentRound, parseUnits("100"));
    });

    it("should be able to redeem buyer tokens", async function () {
      await vault.stake(parseUnits("100"));

      await expect(vault.redeem(parseUnits("50")))
        .to.emit(vault, "Redeem")
        .withArgs(dev_account.address, currentRound, parseUnits("50"));
    });
  });

  describe("Settle the Reward", function () {
    beforeEach(async function () {
      await vault.setDegisPerRound(parseUnits("4"));
      await vault.setDistributionInterval(1);
    });

    it("should be able to settle correctly", async function () {
      await vault.stake(parseUnits("1"));
      await vault.connect(user1).stake(parseUnits("3"));
      await vault.settleCurrentRound();

      expect(await vault.currentRound()).to.equal(currentRound + 1);

      const blockNumber = await ethers.provider.getBlockNumber();
      expect(await vault.lastDistributionBlock()).to.equal(blockNumber);
    });

    it("should be able to claim by user himself", async function () {
      const times = 20;
      for (let i = 0; i < times; i++) {
        await vault.stake(parseUnits("1"));
        await vault.connect(user1).stake(parseUnits("3"));
        await vault.settleCurrentRound();
      }

      await vault.claimOwnReward();
      await vault.connect(user1).claimOwnReward();

      expect(await degis.balanceOf(dev_account.address)).to.equal(
        parseUnits(times.toString())
      );
      expect(await degis.balanceOf(user1.address)).to.equal(
        parseUnits((3 * times).toString())
      );

      for (let i = 0; i < times; i++) {
        await vault.stake(parseUnits("1"));
        await vault.connect(user1).stake(parseUnits("3"));
        await vault.settleCurrentRound();
      }
      await vault.claimOwnReward();
      await vault.connect(user1).claimOwnReward();

      expect(await degis.balanceOf(dev_account.address)).to.equal(
        parseUnits((times * 2).toString())
      );
      expect(await degis.balanceOf(user1.address)).to.equal(
        parseUnits((6 * times).toString())
      );
    });

    it("should be able to check the pending reward", async function () {
      const times = 20;
      for (let i = 0; i < times; i++) {
        await vault.stake(parseUnits("1"));
        await vault.connect(user1).stake(parseUnits("3"));
        await vault.settleCurrentRound();
      }
      expect(await vault.pendingReward()).to.equal(
        parseUnits(times.toString())
      );
      expect(await vault.connect(user1).pendingReward()).to.equal(
        parseUnits((3 * times).toString())
      );
    });
  });
});