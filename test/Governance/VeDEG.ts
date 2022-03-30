import { expect } from "chai";
import { ethers } from "hardhat";
import {
  DegisToken,
  DegisToken__factory,
  FarmingPool,
  FarmingPool__factory,
  VoteEscrowedDegis,
  VoteEscrowedDegis__factory,
} from "../../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  getLatestBlockTimestamp,
  stablecoinToWei,
  toWei,
  zeroAddress,
} from "../utils";
import { BigNumberish } from "ethers";
import { formatEther, parseUnits } from "ethers/lib/utils";

describe("Farming Pool", function () {
  let FarmingPool: FarmingPool__factory, pool: FarmingPool;
  let DegisToken: DegisToken__factory, degis: DegisToken;
  let VeDEGToken: VoteEscrowedDegis__factory, veDEG: VoteEscrowedDegis;

  let dev_account: SignerWithAddress, user1: SignerWithAddress;

  // Pool info type definition
  type PoolInfo = {
    lpToken: string;
    basicDegisPerSecond: BigNumberish;
    bonusDegisPerSecond: BigNumberish;
    lastRewardTimestamp: BigNumberish;
    accDegisPerShare: BigNumberish;
    accDegisPerBonusShare: BigNumberish;
    totalBonus: BigNumberish;
  };

  beforeEach(async function () {
    [dev_account, user1] = await ethers.getSigners();

    DegisToken = await ethers.getContractFactory("DegisToken");
    degis = await DegisToken.deploy();

    FarmingPool = await ethers.getContractFactory("FarmingPool");
    pool = await FarmingPool.deploy(degis.address);
    await pool.deployed();

    VeDEGToken = await ethers.getContractFactory("VoteEscrowedDegis");
    veDEG = await VeDEGToken.deploy();
    await veDEG.deployed();
    // Initialize veDEG
    await veDEG.initialize(degis.address, pool.address);

    // Add minter role for farming pool contract
    await degis.addMinter(pool.address);

    // Set veDEG address in farming
    await pool.setVeDEG(veDEG.address);
  });

  describe("Deployment", function () {
    it("should have the correct owner", async function () {
      expect(await veDEG.owner()).to.equal(dev_account.address);
    });
    it("should have the correct generation rate", async function () {
      expect(await veDEG.generationRate()).to.equal(toWei("1"));
    });

    it("should have the correct mat cap ratio", async function () {
      expect(await veDEG.maxCapRatio()).to.equal(100);
    });
  });

  describe("Owner Functions", function () {
    it("should be able to change the generation rate", async function () {
      await expect(veDEG.setGenerationRate(toWei("2")))
        .to.emit(veDEG, "GenerationRateChanged")
        .withArgs(toWei("1"), toWei("2"));
    });
  });
});

async function mineBlocks(blockNumber: number) {
  while (blockNumber > 0) {
    blockNumber--;
    await hre.network.provider.request({
      method: "evm_mine",
      params: [],
    });
  }
}
