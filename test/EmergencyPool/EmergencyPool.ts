import { expect } from "chai";
import { ethers } from "hardhat";
import {
  EmergencyPool,
  EmergencyPool__factory,
  MockUSD,
  MockUSD__factory,
} from "../../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { stablecoinToWei } from "../utils";

describe("Emergency Pool", function () {
  let EmergencyPool: EmergencyPool__factory, pool: EmergencyPool;
  let MockUSD: MockUSD__factory, usd: MockUSD;

  let dev_account: SignerWithAddress, non_owner: SignerWithAddress;

  beforeEach(async function () {
    [dev_account, non_owner] = await ethers.getSigners();

    EmergencyPool = await ethers.getContractFactory("EmergencyPool");
    pool = await EmergencyPool.deploy();
    await pool.deployed();

    MockUSD = await ethers.getContractFactory("MockUSD");
    usd = await MockUSD.deploy();
    await usd.deployed();
  });

  describe("Deployment", function () {
    it("should have the correct name", async function () {
      expect(await pool.name()).to.equal("Degis Emergency Pool");
    });

    it("should have the correct owner", async function () {
      expect(await pool.owner()).to.equal(dev_account.address);
    });
  });

  describe("Deposit and Withdraw", function () {
    it("should be able to deposit funds into the pool", async function () {
      await usd.approve(pool.address, stablecoinToWei("100"));

      expect(await pool.deposit(usd.address, stablecoinToWei("100")))
        .to.emit(pool, "Deposit")
        .withArgs(usd.address, dev_account.address, stablecoinToWei("100"));
    });

    it("should not be able to deposit with zero amount", async function () {
      await usd.approve(pool.address, stablecoinToWei("100"));

      await expect(
        pool.deposit(usd.address, stablecoinToWei("0"))
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("should be able to emergency withdraw funds from the pool", async function () {
      await usd.approve(pool.address, stablecoinToWei("100"));
      await pool.deposit(usd.address, stablecoinToWei("100"));

      expect(await pool.emergencyWithdraw(usd.address, stablecoinToWei("100")))
        .to.emit(pool, "Withdraw")
        .withArgs(usd.address, dev_account.address, stablecoinToWei("100"));
    });

    it("should not be able to withdraw funds by non-owner", async function () {
      await usd.approve(pool.address, stablecoinToWei("100"));
      await pool.deposit(usd.address, stablecoinToWei("100"));

      await expect(
        pool
          .connect(non_owner)
          .emergencyWithdraw(usd.address, stablecoinToWei("100"))
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should not be able to withdraw more funds than the balance", async function () {
      await usd.approve(pool.address, stablecoinToWei("100"));
      await pool.deposit(usd.address, stablecoinToWei("100"));

      await expect(
        pool.emergencyWithdraw(usd.address, stablecoinToWei("101"))
      ).to.be.revertedWith("Insufficient funds");
    });
  });
});
