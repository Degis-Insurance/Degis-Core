import { expect } from "chai";
import { ethers } from "hardhat";

describe("DegisToken", function () {
  it("should have the correct name and symbol", async function () {
    const DegisToken = await ethers.getContractFactory("DegisToken");
    const degis = await DegisToken.deploy();
    await degis.deployed();

    expect(await degis.name()).to.equal("DegisToken");
  });
});
