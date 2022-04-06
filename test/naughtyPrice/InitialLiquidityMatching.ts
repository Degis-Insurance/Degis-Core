import { expect } from "chai";
import { ethers } from "hardhat";
import {
  PolicyCore__factory,
  PolicyCore,
  MockUSD__factory,
  MockUSD,
  NaughtyFactory__factory,
  NaughtyFactory,
  PriceGetter__factory,
  PriceGetter,
  NPPolicyToken,
  NPPolicyToken__factory,
  NaughtyPair__factory,
  NaughtyPair,
  PriceFeedMock__factory,
  PriceFeedMock,
  NaughtyRouter__factory,
  NaughtyRouter,
  BuyerToken__factory,
  BuyerToken,
  NaughtyPriceILM__factory,
  NaughtyPriceILM,
  ILMToken__factory,
  ILMToken,
} from "../../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  defaultAbiCoder,
  getContractAddress,
  getCreate2Address,
  Interface,
  keccak256,
  parseUnits,
  solidityKeccak256,
  solidityPack,
} from "ethers/lib/utils";

import {
  getLatestBlockTimestamp,
  stablecoinToWei,
  toBN,
  toWei,
  zeroAddress,
} from "../utils";

describe("Policy Core and Naughty Factory", function () {
  let ILMContract: NaughtyPriceILM__factory, ILM: NaughtyPriceILM;
  let PolicyCore: PolicyCore__factory, core: PolicyCore;
  let MockUSD: MockUSD__factory, usd: MockUSD;
  let BuyerToken: BuyerToken__factory, buyerToken: BuyerToken;
  let NaughtyFactory: NaughtyFactory__factory, factory: NaughtyFactory;
  let PriceGetter: PriceGetter__factory, priceGetter: PriceGetter;
  let PriceFeedMock: PriceFeedMock__factory, priceFeedMock: PriceFeedMock;
  let NPPolicyToken: NPPolicyToken__factory, policyToken: NPPolicyToken;
  let NaughtyPair: NaughtyPair__factory, pair: NaughtyPair;
  let NaughtyRouter: NaughtyRouter__factory, router: NaughtyRouter;

  let dev_account: SignerWithAddress, user1: SignerWithAddress;

  beforeEach(async function () {
    [dev_account, user1] = await ethers.getSigners();

    // 6 decimals for usd
    MockUSD = await ethers.getContractFactory("MockUSD");
    usd = await MockUSD.deploy();

    // 18 decimals for buyer token
    BuyerToken = await ethers.getContractFactory("BuyerToken");
    buyerToken = await BuyerToken.deploy();

    NaughtyFactory = await ethers.getContractFactory("NaughtyFactory");
    factory = await NaughtyFactory.deploy();

    PriceGetter = await ethers.getContractFactory("PriceGetter");
    priceGetter = await PriceGetter.deploy();

    PriceFeedMock = await ethers.getContractFactory("PriceFeedMock");
    priceFeedMock = await PriceFeedMock.deploy();

    NPPolicyToken = await ethers.getContractFactory("NPPolicyToken");

    PolicyCore = await ethers.getContractFactory("PolicyCore");
    core = await PolicyCore.deploy(
      usd.address,
      factory.address,
      priceFeedMock.address
    );

    await factory.setPolicyCoreAddress(core.address);

    await core.setLottery(dev_account.address);
    await core.setIncomeSharing(dev_account.address);

    ILMContract = await ethers.getContractFactory("NaughtyPriceILM");
    ILM = await ILMContract.deploy();
    await ILM.deployed();

    await ILM.initialize(core.address);
  });

  describe("Deployment", function () {
    it("should have the correct owner", async function () {
      expect(await ILM.owner()).to.equal(dev_account.address);
    });

    it("should have the correct policy core address", async function () {
      expect(await ILM.policyCore()).to.equal(core.address);
    });
  });

  describe("Start ILM", function () {
    let policyTokenName: string, tokenDecimals: number, round: string;
    let policyTokenAddress: string;
    const ILM_TIME = 86400;
    beforeEach(async function () {
      // Deploy a new policy token
      const now = await getLatestBlockTimestamp(ethers.provider);

      policyTokenName = "AVAX_100.0_L_2204";
      tokenDecimals = await usd.decimals();
      round = "2204";

      await core.deployPolicyToken(
        "AVAX",
        usd.address,
        false,
        0,
        tokenDecimals,
        toWei("100"),
        round,
        now + 60000,
        now + 60000
      );

      policyTokenAddress = await core.findAddressbyName(policyTokenName);

      // Mint usd
      await usd.mint(user1.address, stablecoinToWei("100000"));
    });

    it("should not be able to start a new round ILM by non-owner", async function () {
      await expect(
        ILM.connect(user1).startILM(policyTokenAddress, usd.address, ILM_TIME)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("should not be able to start a new round ILM with wrong token address", async function () {
      const wrongTokenAddress = zeroAddress();
      await expect(
        ILM.startILM(wrongTokenAddress, usd.address, ILM_TIME)
      ).to.be.revertedWith("Policy name not found");
    });
    it("should not be able to start a new round ILM with wrong stablecoin address", async function () {
      const wrongStablecoin = buyerToken.address;
      await expect(
        ILM.startILM(policyTokenAddress, wrongStablecoin, ILM_TIME)
      ).to.be.revertedWith(customErrorMsg("'StablecoinNotSupport()'"));
    });
    it("should be able to start a new round ILM", async function () {
      const startTime = await getLatestBlockTimestamp(ethers.provider);
      const nonce = await ethers.provider.getTransactionCount(ILM.address);
      const lptokenAddress = getContractAddress({
        from: ILM.address,
        nonce: nonce,
      });
      await expect(ILM.startILM(policyTokenAddress, usd.address, ILM_TIME))
        .to.emit(ILM, "ILMStart")
        .withArgs(
          policyTokenAddress,
          usd.address,
          startTime + 1 + ILM_TIME, // latest time stamp is startTime + 1
          lptokenAddress
        );

      const ILMPairInfo = await ILM.pairs(policyTokenAddress);

      expect(ILMPairInfo.status).to.equal(1);
      expect(ILMPairInfo.lptoken).to.equal(lptokenAddress);
      expect(ILMPairInfo.deadline).to.equal(startTime + 1 + ILM_TIME);
      expect(ILMPairInfo.amountA).to.equal(0);
      expect(ILMPairInfo.amountB).to.equal(0);

      const ILMToken_Factory: ILMToken__factory =
        await ethers.getContractFactory("ILMToken");
      const ILMToken: ILMToken = ILMToken_Factory.attach(lptokenAddress);

      expect(await ILMToken.name()).to.equal("ILM-" + policyTokenName);
      expect(await ILMToken.symbol()).to.equal("ILM-" + policyTokenName);
    });
  });
});

// hre can be used in hardhat environment but not with mocha built-in test
async function setNextBlockTime(time: number) {
  await hre.network.provider.request({
    method: "evm_setNextBlockTimestamp",
    params: [time],
  });
}

function customErrorMsg(msg: string) {
  return "custom error " + msg;
}
