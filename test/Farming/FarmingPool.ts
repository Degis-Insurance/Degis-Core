import { expect } from "chai";
import { ethers } from "hardhat";
import {
  DegisToken,
  DegisToken__factory,
  FarmingPool,
  FarmingPool__factory,
} from "../../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { parseUnits } from "ethers/lib/utils";
import { BigNumber } from "ethers";

describe("Farming Pool", function () {
  let FarmingPool: FarmingPool__factory, pool: FarmingPool;
  let DegisToken: DegisToken__factory, degis: DegisToken;

  let dev_account: SignerWithAddress,
    lptoken1: SignerWithAddress,
    lptoken2: SignerWithAddress,
    policyflow: SignerWithAddress;

  beforeEach(async function () {
    [dev_account, lptoken1, lptoken2, policyflow] = await ethers.getSigners();

    DegisToken = await ethers.getContractFactory("DegisToken");
    degis = await DegisToken.deploy();

    FarmingPool = await ethers.getContractFactory("FarmingPool");
    pool = await FarmingPool.deploy(degis.address);

    await pool.deployed();
  });

  describe("Deployment", function () {
    it("should have the correct owner", async function () {
      expect(await pool.owner()).to.equal(dev_account.address);
    });

    it("should have the first pool with ID:0", async function () {
      const defaultPool = await pool.poolList(0);
      expect(defaultPool.lpToken).to.equal(ethers.constants.AddressZero);
      expect(defaultPool.degisPerBlock).to.equal(0);
      expect(defaultPool.lastRewardBlock).to.equal(0);
      expect(defaultPool.accDegisPerShare).to.equal(0);
    });
  });

  describe("Owner Functions", function () {
    it("should be able to set the start block", async function () {
      await expect(pool.setStartBlock(60000))
        .to.emit(pool, "StartBlockChanged")
        .withArgs(60000);
    });

    it("should be able to add a new pool", async function () {
      await expect(pool.add(lptoken1.address, parseUnits("5"), false))
        .to.emit(pool, "NewPoolAdded")
        .withArgs(lptoken1.address, parseUnits("5"));

      await expect(pool.add(lptoken2.address, parseUnits("5"), false))
        .to.emit(pool, "NewPoolAdded")
        .withArgs(lptoken2.address, parseUnits("5"));

      const nextPoolId = await pool._nextPoolId();
      expect(await pool.poolMapping(lptoken1.address)).to.equal(
        nextPoolId.sub(2)
      );
      expect(await pool.poolMapping(lptoken2.address)).to.equal(
        nextPoolId.sub(1)
      );
    });

    it("should not be able to add two same pools", async function () {
      await pool.add(lptoken1.address, parseUnits("5"), false);

      await expect(
        pool.add(lptoken1.address, parseUnits("5"), false)
      ).to.be.revertedWith("This lptoken is already in the farming pool");
    });

    it("should be able to stop a existing pool", async function () {
      await pool.add(lptoken1.address, parseUnits("5"), false);

      const poolId = await pool.poolMapping(lptoken1.address);

      const blockNumBefore = await ethers.provider.getBlockNumber();

      await expect(pool.setDegisReward(poolId, 0, false))
        .to.emit(pool, "StopFarmingPool")
        .withArgs(poolId, blockNumBefore + 1);
    });
  });

  describe("User Functions: Deposit, Redeem and Harvest", function () {});
});
