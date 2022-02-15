import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { getContractAddress, parseUnits } from "ethers/lib/utils";
import { ethers } from "hardhat";
import {
  CoreStakingPool,
  CoreStakingPool__factory,
  DegisToken,
  DegisToken__factory,
  MockUSD,
  MockUSD__factory,
  StakingPoolFactory,
  StakingPoolFactory__factory,
} from "../../typechain";

import {
  getLatestBlockNumber,
  getLatestBlockTimestamp,
  getNow,
} from "../utils";

describe("Degis Staking", function () {
  let StakingPoolFactory: StakingPoolFactory__factory,
    factory: StakingPoolFactory;
  let DegisToken: DegisToken__factory, degis: DegisToken;
  let MockUSD: MockUSD__factory, poolToken: MockUSD;
  let CoreStakingPool: CoreStakingPool__factory, pool: CoreStakingPool;

  let dev_account: SignerWithAddress;

  beforeEach(async function () {
    [dev_account] = await ethers.getSigners();

    CoreStakingPool = await ethers.getContractFactory("CoreStakingPool");

    DegisToken = await ethers.getContractFactory("DegisToken");
    degis = await DegisToken.deploy();

    MockUSD = await ethers.getContractFactory("MockUSD");
    poolToken = await MockUSD.deploy();

    StakingPoolFactory = await ethers.getContractFactory("StakingPoolFactory");
    factory = await StakingPoolFactory.deploy(degis.address);

    await degis.addMinter(factory.address);

    await factory.deployed();
  });

  describe("Factory functions", function () {
    it("should have the correct owner", async function () {
      expect(await factory.owner()).to.equal(dev_account.address);
    });

    it("should be able to create a new pool", async function () {
      const blockNumber = await ethers.provider.getBlockNumber();

      await expect(
        factory.createPool(
          poolToken.address,
          blockNumber,
          parseUnits("1"),
          false
        )
      ).to.emit(factory, "PoolRegistered");

      // Get pool address outside the factory
      const contractAddress = getContractAddress({
        from: factory.address,
        nonce: 1,
      });

      expect(await factory.getPoolAddress(poolToken.address)).to.equal(
        contractAddress
      );
    });
    it("should be able to check the pool's information", async function () {
      const blockNumber = await ethers.provider.getBlockNumber();

      await factory.createPool(
        poolToken.address,
        blockNumber,
        parseUnits("1"),
        false
      );

      // Get pool address outside the factory
      const contractAddress = getContractAddress({
        from: factory.address,
        nonce: 1,
      });

      expect(await factory.getPoolAddress(poolToken.address)).to.equal(
        contractAddress
      );

      const poolInfo = await factory.getPoolData(poolToken.address);
      expect(poolInfo.poolAddress).to.equal(contractAddress);
      expect(poolInfo.poolToken).to.equal(poolToken.address);
      expect(poolInfo.startBlock).to.equal(blockNumber);
      expect(poolInfo.degisPerBlock).to.equal(parseUnits("1"));
      expect(poolInfo.isFlashPool).to.equal(false);
    });
  });

  describe("Pool Functions", async function () {
    let poolAddress: string;
    let blockNumber: number;
    let now: number;

    beforeEach(async function () {
      now = await getLatestBlockTimestamp(ethers.provider);
      blockNumber = await getLatestBlockNumber(ethers.provider);

      await factory.createPool(
        poolToken.address,
        blockNumber,
        parseUnits("1"),
        false
      );

      poolAddress = await factory.getPoolAddress(poolToken.address);

      pool = CoreStakingPool.attach(poolAddress);

      await poolToken.approve(poolAddress, parseUnits("1000"));

      await setNextBlockTime(now + 60);
    });

    it("should be able to stake pool tokens and harvest reward", async function () {
      const blocknum = 5;

      await expect(pool.stake(parseUnits("100"), now + 6000))
        .to.emit(pool, "Stake")
        .withArgs(dev_account.address, parseUnits("100"), now + 6000);

      await mineBlocks(blocknum);

      await pool.harvest();
      expect(await degis.balanceOf(dev_account.address)).to.equal(
        parseUnits((blocknum + 1).toString())
      );
    });

    it("should be able to withdraw pool tokens and get reward", async function () {
      await pool.stake(parseUnits("100"), now + 6000);

      await setNextBlockTime(now + 6000);

      await pool.unstake(0, parseUnits("10"));

      expect(await degis.balanceOf(dev_account.address)).to.equal(
        parseUnits("1")
      );
      expect(await poolToken.balanceOf(dev_account.address)).to.equal(
        parseUnits("99910")
      );
    });

    it("should be able to stake for flexible", async function () {
      await expect(pool.stake(parseUnits("100"), 0))
        .to.emit(pool, "Stake")
        .withArgs(dev_account.address, parseUnits("100"), 0);
    });

    it("should be able to able to stake multiple times and withdraw one", async function () {
      await pool.stake(parseUnits("100"), now + 60000);
      console.log("11111");

      await pool.stake(parseUnits("200"), 0);

      await expect(pool.unstake(1, parseUnits("100")))
        .to.emit(pool, "Unstake")
        .withArgs(dev_account.address, parseUnits("100"));

      expect(await poolToken.balanceOf(dev_account.address)).to.equal(
        parseUnits("99800")
      );
    });
  });
});

// hre can be used in hardhat environment but not with mocha built-in test
async function setNextBlockTime(time: number) {
  await hre.network.provider.request({
    method: "evm_setNextBlockTimestamp",
    params: [time],
  });
}

async function mineBlocks(blockNumber: number) {
  while (blockNumber > 0) {
    blockNumber--;
    await hre.network.provider.request({
      method: "evm_mine",
      params: [],
    });
  }
}
