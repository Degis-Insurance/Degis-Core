import { expect } from "chai";
import { ethers } from "hardhat";
import { PriceGetter, PriceGetter__factory } from "../../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("PriceGetter", function () {
  let PriceGetter: PriceGetter__factory, priceGetter: PriceGetter;
  let dev_account: SignerWithAddress,
    user1: SignerWithAddress,
    user2: SignerWithAddress,
    priceFeedTest: SignerWithAddress;

  beforeEach(async function () {
    PriceGetter = await ethers.getContractFactory("PriceGetter");
    priceGetter = await PriceGetter.deploy();
    await priceGetter.deployed();

    [dev_account, user1, user2, priceFeedTest] = await ethers.getSigners();
  });

  describe("Deployment", function () {
    it("should set the owner", async function () {
      expect(await priceGetter.owner()).to.equal(dev_account.address);
    });

    it("should set some price feeds at the beginning", async function () {
      expect(await priceGetter.getPriceFeedAddress("AVAX")).to.equal(
        "0x5498BB86BC934c8D34FDA08E81D444153d0D06aD"
      );
    });
  });

  describe("Owner Functions", function () {
    it("should be able to add new price feed", async function () {
      await expect(
        priceGetter.setPriceFeed("Test Token", priceFeedTest.address)
      )
        .to.emit(priceGetter, "PriceFeedChanged")
        .withArgs("Test Token", priceFeedTest.address);

      expect(await priceGetter.getPriceFeedAddress("Test Token")).to.equal(
        priceFeedTest.address
      );
    });
  });
});
