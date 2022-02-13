import { expect } from "chai";
import { ethers } from "hardhat";
import {
  EmergencyPool,
  EmergencyPool__factory,
  MockUSD,
  MockUSD__factory,
} from "../../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { parseUnits } from "ethers/lib/utils";

describe("Farming Pool", function () {
  let EmergencyPool: EmergencyPool__factory, pool: EmergencyPool;
  let MockUSD: MockUSD__factory, usd: MockUSD;

  let dev_account: SignerWithAddress, user1: SignerWithAddress;

  beforeEach(async function () {
    [dev_account, user1] = await ethers.getSigners();

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
  });

  describe("Deposit and Withdraw", function () {
    it("should be able to deposit funds into the pool", async function () {
      await usd.approve(pool.address, parseUnits("100"));

      expect(await pool.deposit(usd.address, parseUnits("100")))
        .to.emit(pool, "Deposit")
        .withArgs(usd.address, dev_account.address, parseUnits("100"));
    });
  });
});
