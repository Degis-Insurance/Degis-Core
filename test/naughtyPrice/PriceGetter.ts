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

    it("should set AVAX price feeds at the beginning", async function () {
      expect(
        (await priceGetter.priceFeedInfo("AVAX")).priceFeedAddress
      ).to.equal("0x0A77230d17318075983913bC2145DB16C7366156");
    });

    it("should set BTC price feeds at the beginning", async function () {
      expect(
        (await priceGetter.priceFeedInfo("BTC")).priceFeedAddress
      ).to.equal("0x2779D32d5166BAaa2B2b658333bA7e6Ec0C65743");
    });

    it("should set ETH price feeds at the beginning", async function () {
      expect(
        (await priceGetter.priceFeedInfo("ETH")).priceFeedAddress
      ).to.equal("0x976B3D034E162d8bD72D6b9C989d545b839003b0");
    });
  });

  describe("Owner Functions", function () {
    it("should be able to add new price feed", async function () {
      const decimals = 8;
      await expect(
        priceGetter.setPriceFeed("Test Token", priceFeedTest.address, decimals)
      )
        .to.emit(priceGetter, "PriceFeedChanged")
        .withArgs("Test Token", priceFeedTest.address, decimals);

      expect(
        (await priceGetter.priceFeedInfo("Test Token")).priceFeedAddress
      ).to.equal(priceFeedTest.address);
    });
  });
});
