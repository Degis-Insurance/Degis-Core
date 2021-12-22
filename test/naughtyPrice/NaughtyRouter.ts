import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import { ethers } from "hardhat";
import {
  BuyerToken,
  BuyerToken__factory,
  MockUSD,
  MockUSD__factory,
  NaughtyFactory,
  NaughtyFactory__factory,
  NaughtyRouter,
  NaughtyRouter__factory,
  NPPolicyToken,
  NPPolicyToken__factory,
  PolicyCore,
  PolicyCore__factory,
  PriceGetter,
  PriceGetter__factory,
} from "../../typechain";

describe("Naughty Router", function () {
  let NaughtyRouter: NaughtyRouter__factory, router: NaughtyRouter;
  let MockUSD: MockUSD__factory, usd: MockUSD;
  let PriceGetter: PriceGetter__factory, priceGetter: PriceGetter;
  let PolicyCore: PolicyCore__factory, core: PolicyCore;
  let NaughtyFactory: NaughtyFactory__factory, factory: NaughtyFactory;
  let BuyerToken: BuyerToken__factory, buyerToken: BuyerToken;
  let NPPolicyToken: NPPolicyToken__factory, policyToken: NPPolicyToken;

  let dev_account: SignerWithAddress,
    user1: SignerWithAddress,
    user2: SignerWithAddress;

  let time: number, now: number, deadline: number, settleTimestamp: number;
  let policyTokenName: string, policyTokenInfo: any;
  let pairAddress: string;

  const MINIMUM_LP = 1e3;

  beforeEach(async function () {
    [dev_account, user1, user2] = await ethers.getSigners();

    NaughtyFactory = await ethers.getContractFactory("NaughtyFactory");
    factory = await NaughtyFactory.deploy();

    MockUSD = await ethers.getContractFactory("MockUSD");
    usd = await MockUSD.deploy();

    PriceGetter = await ethers.getContractFactory("PriceGetter");
    priceGetter = await PriceGetter.deploy();

    PolicyCore = await ethers.getContractFactory("PolicyCore");
    core = await PolicyCore.deploy(
      usd.address,
      factory.address,
      priceGetter.address
    );

    BuyerToken = await ethers.getContractFactory("BuyerToken");
    buyerToken = await BuyerToken.deploy();

    NaughtyRouter = await ethers.getContractFactory("NaughtyRouter");
    router = await NaughtyRouter.deploy(factory.address, buyerToken.address);

    await core.deployed();
    await factory.deployed();

    await factory.setPolicyCoreAddress(core.address);

    time = new Date().getTime();
    now = Math.floor(time / 1000);
    deadline = now + 300;
    settleTimestamp = now + 600;
    policyTokenName = "BTC_24000.0_L_2112";
    await core.deployPolicyToken(
      "BTC",
      false,
      0,
      parseUnits("24000"),
      2112,
      ethers.BigNumber.from(deadline),
      ethers.BigNumber.from(settleTimestamp)
    );

    await core.deployPool(
      policyTokenName,
      usd.address,
      ethers.BigNumber.from(deadline)
    );

    await router.deployed();

    await router.setPolicyCore(core.address);
    await router.setBuyerToken(buyerToken.address);

    policyTokenInfo = await core.policyTokenInfoMapping(policyTokenName);

    NPPolicyToken = await ethers.getContractFactory("NPPolicyToken");
    policyToken = NPPolicyToken.attach(policyTokenInfo.policyTokenAddress);

    pairAddress = await factory.getPairAddress(
      policyTokenInfo.policyTokenAddress,
      usd.address
    );
  });

  describe("Add and Remove Liquidity", function () {
    it("should be able to add liquidity and get lp tokens", async function () {
      await usd.approve(core.address, parseUnits("10000"));
      await core.deposit(policyTokenName, usd.address, parseUnits("10000"));

      await policyToken.approve(router.address, parseUnits("100"));
      await usd.approve(router.address, parseUnits("100"));

      await expect(
        router.addLiquidity(
          policyTokenInfo.policyTokenAddress,
          usd.address,
          parseUnits("100"),
          parseUnits("100"),
          parseUnits("80"),
          parseUnits("80"),
          dev_account.address,
          now + 30
        )
      )
        .to.emit(router, "LiquidityAdded")
        .withArgs(
          pairAddress,
          parseUnits("100"),
          parseUnits("100"),
          parseUnits("99.999999999999999")
        );
    });

    it("should be able to remove liquidty from the pool", async function () {});

    it("should be able to add liquidity only with stablecoins", async function () {});
  });

  describe("Swap Tokens", function () {
    it("should be able to swap tokens for exact tokens", async function () {});

    it("should be able to swap exact tokens for tokens", async function () {});
  });
});
