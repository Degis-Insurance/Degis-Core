import { expect } from "chai";
import { ethers } from "hardhat";
import {
  BuyerToken__factory,
  BuyerToken,
  DegisToken,
  DegisToken__factory,
} from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("DegisToken", function () {
  let DegisToken: DegisToken__factory, degis: DegisToken;
  let dev_account: SignerWithAddress,
    user1: SignerWithAddress,
    user2: SignerWithAddress;

  beforeEach(async function () {
    DegisToken = await ethers.getContractFactory("DegisToken");
    degis = await DegisToken.deploy();
    await degis.deployed();

    [dev_account, user1, user2] = await ethers.getSigners();
  });

  it("should have the correct name and symbol", async function () {
    expect(await degis.name()).to.equal("DegisToken");
    expect(await degis.symbol()).to.equal("DEG");
  });

  it("should have a hard cap of 100million", async function () {
    expect(await degis.CAP()).to.equal(ethers.utils.parseEther("100000000"));
  });

  it("should have the owner as the first minter", async function () {
    expect(await degis.isMinter(dev_account.address)).to.equal(true);
  });

  it("should have the function to add a new minter", async function () {
    await degis.addMinter(user1.address);
    expect(await degis.isMinter(user1.address)).to.equal(true);
  });

  it("should have the function to remove a minter", async function () {
    await degis.addMinter(user1.address);

    await degis.removeMinter(user1.address, { from: dev_account.address });
    expect(await degis.isMinter(user1.address)).to.equal(false);
  });
});

describe("BuyerToken", function () {
  let BuyerToken: BuyerToken__factory, buyer: BuyerToken;
  let dev_account: SignerWithAddress,
    user1: SignerWithAddress,
    user2: SignerWithAddress;

  beforeEach(async function () {
    BuyerToken = await ethers.getContractFactory("BuyerToken");
    buyer = await BuyerToken.deploy();
    await buyer.deployed();

    [dev_account, user1, user2] = await ethers.getSigners();
  });

  it("should have the correct name and symbol", async function () {
    expect(await buyer.name()).to.equal("DegisBuyerToken");
    expect(await buyer.symbol()).to.equal("DBT");
  });
});
