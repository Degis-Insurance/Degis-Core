import { expect } from "chai";
import { ethers } from "hardhat";
import {
  BuyerToken__factory,
  BuyerToken,
  DegisToken,
  DegisToken__factory,
} from "../typechain";

describe("DegisToken", function () {
  let DegisToken: DegisToken__factory, degis: DegisToken;

  before(async function () {
    DegisToken = await ethers.getContractFactory("DegisToken");
    degis = await DegisToken.deploy();
    await degis.deployed();
  });

  it("should have the correct name and symbol", async function () {
    expect(await degis.name()).to.equal("DegisToken");
    expect(await degis.symbol()).to.equal("DEG");
  });

  it("should have a hard cap of 100million", async function () {
    expect(await degis.CAP()).to.equal(ethers.utils.parseEther("100000000"));
  });

  it("should have the owner as the first minter", async function () {
    const [owner] = await ethers.getSigners();

    expect(await degis.isMinter(owner.address)).to.equal(true);
  });

  it("should have the function to add a new minter", async function () {
    const [owner, user1] = await ethers.getSigners();

    await degis.addMinter(user1.address, { from: owner.address });
    expect(await degis.isMinter(user1.address)).to.equal(true);
  });

  it("should have the function to remove a minter", async function () {
    const [owner, user1] = await ethers.getSigners();

    await degis.removeMinter(user1.address, { from: owner.address });
    expect(await degis.isMinter(user1.address)).to.equal(false);
  });
});

describe("BuyerToken", function () {
  let BuyerToken: BuyerToken__factory, buyer: BuyerToken;

  before(async function () {
    BuyerToken = await ethers.getContractFactory("BuyerToken");
    buyer = await BuyerToken.deploy();
    await buyer.deployed();
  });

  it("should have the correct name and symbol", async function () {
    expect(await buyer.name()).to.equal("DegisBuyerToken");
    expect(await buyer.symbol()).to.equal("DBT");
  });
});
