import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { parseUnits } from "ethers/lib/utils";
import {
  InsurancePool,
  InsurancePool__factory,
  MockUSD,
  MockUSD__factory,
} from "../../typechain";

describe("Insurance Pool for Flight Delay", function () {
  let MockUSD: MockUSD__factory, usd: MockUSD;
  let InsurancePool: InsurancePool__factory, pool: InsurancePool;

  let dev_account: SignerWithAddress,
    emergencyPool: SignerWithAddress,
    lottery: SignerWithAddress,
    policyflow: SignerWithAddress;

  beforeEach(async function () {
    [dev_account, emergencyPool, lottery, policyflow] =
      await ethers.getSigners();

    MockUSD = await ethers.getContractFactory("MockUSD");
    usd = await MockUSD.deploy();

    InsurancePool = await ethers.getContractFactory("InsurancePool");
    pool = await InsurancePool.deploy(
      emergencyPool.address,
      lottery.address,
      usd.address
    );

    await usd.approve(pool.address, parseUnits("10000"));
  });

  describe("Deployment", function () {
    it("should set the correct owner", async function () {
      expect(await pool.owner()).to.equal(dev_account.address);
    });

    it("should have the correct frozen time", async function () {
      const frozen = 7 * 24 * 3600;
      expect(await pool.frozenTime()).to.equal(frozen);
    });
  });

  describe("Owner Functions", function () {
    it("should be able to set a new frozen time", async function () {
      await expect(pool.setFrozenTime(10))
        .to.emit(pool, "FrozenTimeChanged")
        .withArgs(10);
    });
    it("should be able to set a new policy flow address", async function () {
      await expect(pool.setPolicyFlow(policyflow.address))
        .to.emit(pool, "PolicyFlowChanged")
        .withArgs(policyflow.address);
    });
  });

  describe("Stake and Withdraw", function () {
    it("should be able to stake some usd", async function () {
      await expect(pool.stake(parseUnits("100")))
        .to.emit(pool, "Stake")
        .withArgs(dev_account.address, parseUnits("100"));
    });

    it("should not be able to withdraw before the frozen time", async function () {
      await pool.stake(parseUnits("100"));

      await expect(pool.unstake(parseUnits("50"))).to.be.revertedWith(
        "Can not withdraw until the fronzen time"
      );
    });

    it("should be able to withdraw after the frozen time", async function () {
      await pool.stake(parseUnits("100"));

      await pool.setFrozenTime(0);
      //  This will affect other tests
      //   await hre.network.provider.request({
      //     method: "evm_increaseTime",
      //     params: [frozen],
      //   });

      await expect(pool.unstake(parseUnits("50")))
        .to.emit(pool, "Unstake")
        .withArgs(dev_account.address, parseUnits("50"));
    });

    it("should be able to unstake maximum amount", async function () {
      await pool.stake(parseUnits("100"));
      await pool.setFrozenTime(0);
      await expect(pool.unstakeMax())
        .to.emit(pool, "Unstake")
        .withArgs(dev_account.address, parseUnits("100"));
    });
  });
});
