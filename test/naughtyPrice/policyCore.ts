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
  NPPolicyToken,
  NPPolicyToken__factory,
} from "../../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { defaultAbiCoder, keccak256, solidityPack } from "ethers/lib/utils";

describe("Policy Core", function () {
  let PolicyCore: PolicyCore__factory, core: PolicyCore;
  let MockUSD: MockUSD__factory, usd: MockUSD;
  let NaughtyFactory: NaughtyFactory__factory, factory: NaughtyFactory;
  let PriceGetter: PriceGetter__factory, priceGetter: PriceGetter;
  let NPPolicyToken: NPPolicyToken__factory, policyToken: NPPolicyToken;

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

  describe("Deployment", function () {
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

  describe("Owner Functions", function () {
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

  describe("Deploy tokens and pools", function () {
    it("should get the correct address", async function () {
      await factory.setPolicyCoreAddress(core.address);
      expect(await factory.policyCore()).to.equal(core.address);
    });
    it("should be able to deploy a new policy token and get the correct address", async function () {
      await factory.setPolicyCoreAddress(core.address);
      NPPolicyToken = await ethers.getContractFactory("NPPolicyToken");

      const policyTokenName = "BTC_24000_L_2112";

      // Type 1 (If you want to use this function, please change the visibility)
      const bytecode1 = await factory.getPolicyTokenBytecode(policyTokenName);

      // Type 2 (Normally we use this)
      // abi.encode(_tokenName, _tokenName, policyCore)
      const token_init = defaultAbiCoder.encode(
        ["string", "string", "address"],
        [policyTokenName, policyTokenName, core.address]
      );

      // abi.encodePacked(bytecode, abi.encode(_tokenName, _tokenName, policyCore);
      const bytecode2 = solidityPack(
        ["bytes", "bytes"],
        [NPPolicyToken.bytecode, token_init]
      );

      const INIT_CODE_HASH = keccak256(bytecode2);

      const salt = ethers.utils.solidityKeccak256(
        ["string"],
        [policyTokenName]
      );

      const address = ethers.utils.getCreate2Address(
        factory.address,
        salt,
        INIT_CODE_HASH
      );

      const time = new Date().getTime();
      const now = Math.floor(time / 1000);
      const deadline = now + 30;
      const settleTimestamp = now + 60;

      await expect(
        core.deployPolicyToken(
          "BTC",
          false,
          ethers.utils.parseUnits("24000"),
          2112,
          ethers.BigNumber.from(deadline),
          ethers.BigNumber.from(settleTimestamp)
        )
      )
        .to.emit(core, "PolicyTokenDeployed")
        .withArgs("BTC_24000_L_2112", address, deadline, settleTimestamp);
    });
  });
});
