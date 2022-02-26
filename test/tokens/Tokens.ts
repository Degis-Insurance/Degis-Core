import { expect } from "chai";
import { ethers } from "hardhat";
import {
  BuyerToken__factory,
  BuyerToken,
  DegisToken,
  DegisToken__factory,
  ERC20PermitWithMultipleMinters,
  ERC20PermitWithMultipleMinters__factory,
} from "../../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("DegisToken", function () {
  let DegisToken: DegisToken__factory, degis: DegisToken;
  let dev_account: SignerWithAddress, user1: SignerWithAddress;

  beforeEach(async function () {
    DegisToken = await ethers.getContractFactory("DegisToken");
    degis = await DegisToken.deploy();
    await degis.deployed();

    [dev_account, user1] = await ethers.getSigners();
  });

  it("should have the correct name and symbol", async function () {
    expect(await degis.name()).to.equal("DegisToken");
    expect(await degis.symbol()).to.equal("DEG");
  });

  it("should have a hard cap of 100million", async function () {
    expect(await degis.CAP()).to.equal(ethers.utils.parseEther("100000000"));
  });

  it("should have the correct owner", async function () {
    expect(await degis.owner()).to.equal(dev_account.address);
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

  it("should be able to transfer the ownership", async function () {
    await degis.transferOwnership(user1.address);

    expect(await degis.owner()).to.equal(user1.address);
  });

  it("should be able to renounce the ownership", async function () {
    await degis.renounceOwnership();

    expect(await degis.owner()).to.equal(ethers.constants.AddressZero);
  });
});

describe("BuyerToken", function () {
  let BuyerToken: BuyerToken__factory, buyer: BuyerToken;
  let dev_account: SignerWithAddress, user1: SignerWithAddress;

  beforeEach(async function () {
    BuyerToken = await ethers.getContractFactory("BuyerToken");
    buyer = await BuyerToken.deploy();
    await buyer.deployed();

    [dev_account, user1] = await ethers.getSigners();
  });

  it("should have the correct name and symbol", async function () {
    expect(await buyer.name()).to.equal("DegisBuyerToken");
    expect(await buyer.symbol()).to.equal("DBT");
  });
});

describe("ERC20Permit", function () {
  let ERC20Permit: ERC20PermitWithMultipleMinters__factory,
    erc20: ERC20PermitWithMultipleMinters;

  let dev_account: SignerWithAddress,
    user1: SignerWithAddress,
    user2: SignerWithAddress;

  beforeEach(async function () {
    [dev_account, user1, user2] = await ethers.getSigners();

    ERC20Permit = await ethers.getContractFactory(
      "ERC20PermitWithMultipleMinters"
    );
    erc20 = await ERC20Permit.deploy("TestToken", "TST");

    await erc20.deployed();
  });

  it("should have the permit", async function () {
    
  });
});
