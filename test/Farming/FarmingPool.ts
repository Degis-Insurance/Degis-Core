import { expect } from "chai";
import { ethers } from "hardhat";
import {
  DegisToken,
  DegisToken__factory,
  FarmingPool,
  FarmingPool__factory,
} from "../../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Farming Pool", function () {
  let FarmingPool: FarmingPool__factory, pool: FarmingPool;
  let DegisToken: DegisToken__factory, degis: DegisToken;

  let dev_account: SignerWithAddress,
    user1: SignerWithAddress,
    user2: SignerWithAddress,
    policyflow: SignerWithAddress;

  beforeEach(async function () {
    [dev_account, user1, user2, policyflow] = await ethers.getSigners();

    DegisToken = await ethers.getContractFactory("DegisToken");
    degis = await DegisToken.deploy();

    FarmingPool = await ethers.getContractFactory("FarmingPool");
    pool = await FarmingPool.deploy(degis.address);

    await pool.deployed();
  });

  describe("Deployment", function () {});

  describe("Owner Functions", function () {});

  describe("User Functions: Deposit, Redeem and Harvest", function () {});
});
