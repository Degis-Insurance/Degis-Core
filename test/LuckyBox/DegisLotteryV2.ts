import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import { ethers } from "hardhat";

describe("Degis Lottery V2", function () {
  let dev_account: SignerWithAddress;

  beforeEach(async function () {
    [dev_account] = await ethers.getSigners();
  });

  describe("Deployment", function () {
    it("should be able to", async function () {});
  });

  describe("Owner Functions", function () {});

  describe("Main Functions", function () {});
});
