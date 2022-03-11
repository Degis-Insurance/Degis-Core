import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
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

import {
  getLatestBlockTimestamp,
  getNow,
  stablecoinToWei,
  toBN,
  toWei,
} from "../utils";

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

  let now: number, deadline: number, settleTimestamp: number;
  let policyTokenName: string, policyTokenInfo: any;
  let pairAddress: string;

  const txDelay = 60000;

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

    now = await getLatestBlockTimestamp(ethers.provider);
    deadline = now + 30000;
    settleTimestamp = now + 60000;
    policyTokenName = "BTC_24000.0_L_2112";
    await core.deployPolicyToken(
      "BTC",
      false,
      0,
      toWei("24000"),
      2112,
      toBN(deadline),
      toBN(settleTimestamp)
    );

    await core.deployPool(policyTokenName, usd.address, toBN(deadline), 20);

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

    await usd.approve(core.address, stablecoinToWei("10000"));
    await core.deposit(policyTokenName, usd.address, stablecoinToWei("10000"));

    await buyerToken.addMinter(router.address);
  });

  describe("Basic modifier", function () {
    it("should be reverted when pass the deadline of a single transaction", async function () {
      await policyToken.approve(router.address, toWei("100"));
      await usd.approve(router.address, toWei("100"));

      await expect(
        router.addLiquidity(
          policyTokenInfo.policyTokenAddress,
          usd.address,
          toWei("100"),
          toWei("100"),
          toWei("80"),
          toWei("80"),
          dev_account.address,
          now - 30
        )
      ).to.be.revertedWith("expired transaction");
    });
  });

  describe("Add and Remove Liquidity", function () {
    it("should be able to add liquidity and get lp tokens", async function () {
      await policyToken.approve(router.address, toWei("100"));
      await usd.approve(router.address, toWei("100"));

      await expect(
        router.addLiquidity(
          policyTokenInfo.policyTokenAddress,
          usd.address,
          toWei("100"),
          toWei("100"),
          toWei("80"),
          toWei("80"),
          dev_account.address,
          now + txDelay
        )
      )
        .to.emit(router, "LiquidityAdded")
        .withArgs(
          pairAddress,
          toWei("100"),
          toWei("100"),
          toWei("99.999999999999999")
        );
    });

    it("should be able to remove liquidty from the pool", async function () {
      await policyToken.approve(router.address, toWei("200"));
      await usd.approve(router.address, toWei("200"));

      await router.addLiquidity(
        policyTokenInfo.policyTokenAddress,
        usd.address,
        toWei("100"),
        toWei("100"),
        toWei("80"),
        toWei("80"),
        dev_account.address,
        now + txDelay
      );

      await router.addLiquidity(
        policyTokenInfo.policyTokenAddress,
        usd.address,
        toWei("100"),
        toWei("100"),
        toWei("80"),
        toWei("80"),
        dev_account.address,
        now + txDelay
      );

      const NaughtyPair = await ethers.getContractFactory("NaughtyPair");
      const pair = NaughtyPair.attach(pairAddress);
      await pair.approve(router.address, toWei("10"));

      await expect(
        router.removeLiquidity(
          policyTokenInfo.policyTokenAddress,
          usd.address,
          toWei("10"),
          toWei("8"),
          toWei("8"),
          dev_account.address,
          now + txDelay
        )
      )
        .to.emit(router, "LiquidityRemoved")
        .withArgs(pairAddress, toWei("10"), toWei("10"), toWei("10"));
    });

    it("should be able to add liquidity only with stablecoins", async function () {
      await core.setNaughtyRouter(router.address);

      await policyToken.approve(router.address, toWei("10000"));
      await usd.approve(router.address, toWei("10000"));
      await usd.approve(core.address, toWei("10000"));

      // await expect(
      //   router.addLiquidityWithUSD(
      //     policyTokenInfo.policyTokenAddress,
      //     usd.address,
      //     toWei("100"),
      //     dev_account.address,
      //     80,
      //     now + txDelay
      //   )
      // ).to.be.revertedWith("No tokens in the pool");

      // await router.addLiquidity(
      //   policyTokenInfo.policyTokenAddress,
      //   usd.address,
      //   toWei("100"),
      //   toWei("100"),
      //   toWei("80"),
      //   toWei("80"),
      //   dev_account.address,
      //   now + txDelay
      // );

      await expect(
        router.addLiquidityWithUSD(
          policyTokenInfo.policyTokenAddress,
          usd.address,
          toWei("50"),
          toWei("50"),
          toWei("50"),
          toWei("50"),
          dev_account.address,
          now + txDelay
        )
      ).to.emit(router, "LiquidityAdded");

      expect(await policyToken.balanceOf(dev_account.address)).to.equal(
        toWei("10000")
      );
    });
  });

  describe("Swap Tokens", function () {
    beforeEach(async function () {
      await core.setNaughtyRouter(router.address);

      await policyToken.approve(router.address, toWei("10000"));
      await usd.approve(router.address, toWei("10000"));

      await router.addLiquidity(
        policyTokenInfo.policyTokenAddress,
        usd.address,
        toWei("100"),
        toWei("100"),
        toWei("80"),
        toWei("80"),
        dev_account.address,
        now + txDelay
      );
    });
    it("should be able to swap tokens for exact tokens", async function () {
      // Swap for 1 usd, max pay 2 policy tokens
      await router.swapTokensforExactTokens(
        toWei("2"),
        toWei("1"),
        policyTokenInfo.policyTokenAddress,
        usd.address,
        dev_account.address,
        now + txDelay
      );

      const bal = await usd.balanceOf(dev_account.address);
      // console.log(ethers.utils.formatEther(bal));
      expect(await usd.balanceOf(dev_account.address)).to.equal(toWei("89901"));
    });

    it("should be able to swap exact tokens for tokens", async function () {
      await router.swapExactTokensforTokens(
        toWei("1"),
        toWei("0.5"),
        usd.address,
        policyTokenInfo.policyTokenAddress,
        dev_account.address,
        now + txDelay
      );

      expect(await usd.balanceOf(dev_account.address)).to.equal(toWei("89899"));
    });
  });
});
