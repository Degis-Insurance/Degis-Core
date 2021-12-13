import { expect } from "chai";
import { ethers } from "hardhat";
import { FDPolicyToken, FDPolicyToken__factory } from "../typechain";

describe("Flight Delay Policy Token", function () {
  let FDPolicyToken: FDPolicyToken__factory, fdToken: FDPolicyToken;

  before(async function () {
    FDPolicyToken = await ethers.getContractFactory("FDPolicyToken");
    fdToken = await FDPolicyToken.deploy();
    await fdToken.deployed();
  });

  it("should have correct name and symbol", async function () {
    expect(await fdToken.name()).to.equal("Degis_FlightDelay_PolicyToken");
    expect(await fdToken.symbol()).to.equal("DEGIS_FD_PT");
  });
});
