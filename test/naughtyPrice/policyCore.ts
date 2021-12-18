import { expect } from "chai";
import { ethers } from "hardhat";
import {
  PolicyCore__factory,
  PolicyCore,
  MockUSD__factory,
  MockUSD,
  NaughtyFactory__factory,
  PriceGetter__factory,
  NaughtyFactory,
  PriceGetter,
} from "../../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Policy Core", function () {
  let PolicyCore: PolicyCore__factory, core: PolicyCore;
  let MockUSD: MockUSD__factory, usd: MockUSD;
  let NaughtyFactory: NaughtyFactory__factory, factory: NaughtyFactory;
  let PriceGetter: PriceGetter__factory, priceGetter: PriceGetter;

  let dev_account: SignerWithAddress,
    user1: SignerWithAddress,
    user2: SignerWithAddress,
    user3: SignerWithAddress;

  beforeEach(async function () {
    MockUSD = await ethers.getContractFactory("MockUSD");
    usd = await MockUSD.deploy();
    NaughtyFactory = await ethers.getContractFactory("NaughtyFactory");
    factory = await NaughtyFactory.deploy();
    PriceGetter = await ethers.getContractFactory("PriceGetter");
    priceGetter = await PriceGetter.deploy();

    PolicyCore = await ethers.getContractFactory("PolicyCore");
    core = await PolicyCore.deploy(
      usd.address,
      factory.address,
      priceGetter.address
    );
    await core.deployed();

    [dev_account, user1, user2, user3] = await ethers.getSigners();
  });

  describe("Deployment", async function () {
    it("should set the deployer as the owner", async function () {
      expect(await core.owner()).to.equal(dev_account.address);
    });

    it("should set the first stablecoin after deployment", async function () {
      expect(await core.supportedStablecoin(usd.address)).to.equal(true);
    });

    it("should have the correct factory & priceGetter address", async function () {
      expect(await core.factory()).to.equal(factory.address);
      expect(await core.priceGetter()).to.equal(priceGetter.address);
    });
  });

  describe("Owner Functions", async function () {
    it("should be able to add a new stablecoin", async function () {
      await expect(core.addStablecoin(user1.address))
        .to.emit(core, "NewStablecoinAdded")
        .withArgs(user1.address);

      expect(await core.supportedStablecoin(user1.address)).to.equal(true);
    });

    it("should be able to set a new lottery", async function () {
      await expect(core.setLottery(user1.address))
        .to.emit(core, "LotteryChanged")
        .withArgs(user1.address);

      expect(await core.lottery()).to.equal(user1.address);
    });

    it("should be able to set a new emergencyPool", async function () {
      await expect(core.setEmergencyPool(user2.address))
        .to.emit(core, "EmergencyPoolChanged")
        .withArgs(user2.address);
      expect(await core.emergencyPool()).to.equal(user2.address);
    });
  });
});
