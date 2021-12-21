import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { NaughtyRouter, NaughtyRouter__factory } from "../../typechain";

describe("Naughty Router", function () {
  let NaughtyRouter: NaughtyRouter__factory, router: NaughtyRouter;
  let dev_account: SignerWithAddress,
    user1: SignerWithAddress,
    suer2: SignerWithAddress;

  beforeEach(async function () {
    // NaughtyRouter = await ethers.getContractFactory("NaughtyRouter");
    // router = await NaughtyRouter.deploy();
    // await router.deployed();
  });

  describe("Add and Remove Liquidity", function () {
    it("should be able to add liquidity and get lp tokens", async function () {});

    it("should be able to remove liquidty from the pool", async function () {});

    it("should be able to add liquidity only with stablecoins", async function () {});
  });

  describe("Swap Tokens", function () {
    it("should be able to swap tokens for exact tokens", async function () {});

    it("should be able to swap exact tokens for tokens", async function () {});
  });
});
