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
  NaughtyPair,
  NaughtyPair__factory,
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
  formatStablecoin,
  getLatestBlockTimestamp,
  stablecoinToWei,
  toBN,
  toWei,
} from "../utils";

describe("Naughty Router", function () {
  let router: NaughtyRouter;
  let usd: MockUSD;
  let priceGetter: PriceGetter;
  let core: PolicyCore;
  let factory: NaughtyFactory;
  let buyerToken: BuyerToken;
  let NPPolicyToken: NPPolicyToken__factory, policyToken: NPPolicyToken;
  let NaughtyPair: NaughtyPair__factory, pair: NaughtyPair;

  let dev_account: SignerWithAddress,
    user1: SignerWithAddress,
    user2: SignerWithAddress;

  let now: number, deadline: number, settleTimestamp: number;
  let policyTokenName: string, policyTokenInfo: any;
  let pairAddress: string;

  const txDelay = 60000;

  beforeEach(async function () {
    [dev_account, user1, user2] = await ethers.getSigners();

    factory = await new NaughtyFactory__factory(dev_account).deploy();
    await factory.initialize();

    usd = await new MockUSD__factory(dev_account).deploy();

    priceGetter = await new PriceGetter__factory(dev_account).deploy();

    core = await new PolicyCore__factory(dev_account).deploy();
    await core.initialize(usd.address, factory.address, priceGetter.address);

    buyerToken = await new BuyerToken__factory(dev_account).deploy();

    router = await new NaughtyRouter__factory(dev_account).deploy();
    await router.initialize(factory.address, buyerToken.address);

    await core.deployed();
    await factory.deployed();

    await factory.setPolicyCoreAddress(core.address);

    now = await getLatestBlockTimestamp(ethers.provider);
    deadline = now + 30000;
    settleTimestamp = now + 60000;
    policyTokenName = "BTC_24000.0_L_2112";
    await core.deployPolicyToken(
      "BTC",
      usd.address,
      false,
      0,
      6,
      toWei("24000"),
      "2112",
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

    await usd.approve(core.address, stablecoinToWei("100000"));
    await usd.connect(user1).approve(core.address, stablecoinToWei("100000"));
    await core.deposit(policyTokenName, usd.address, stablecoinToWei("10000"));
    await usd.mint(user1.address, stablecoinToWei("100000"));
    await core
      .connect(user1)
      .deposit(policyTokenName, usd.address, stablecoinToWei("10000"));

    await buyerToken.addMinter(router.address);
  });

  describe("Basic modifier", function () {
    it("should be reverted when pass the deadline of a single transaction", async function () {
      await policyToken.approve(router.address, stablecoinToWei("1000"));
      await usd.approve(router.address, stablecoinToWei("1000"));

      now = await getLatestBlockTimestamp(ethers.provider);

      await expect(
        router.addLiquidity(
          policyTokenInfo.policyTokenAddress,
          usd.address,
          stablecoinToWei("100"),
          stablecoinToWei("100"),
          stablecoinToWei("80"),
          stablecoinToWei("80"),
          dev_account.address,
          now - 30
        )
      ).to.be.revertedWith("expired transaction");
    });
  });

  describe("Add and Remove Liquidity", function () {
    it("should be able to add liquidity and get lp tokens", async function () {
      await policyToken.approve(router.address, stablecoinToWei("100"));
      await usd.approve(router.address, stablecoinToWei("100"));

      now = await getLatestBlockTimestamp(ethers.provider);

      await expect(
        router.addLiquidity(
          policyTokenInfo.policyTokenAddress,
          usd.address,
          stablecoinToWei("100"),
          stablecoinToWei("100"),
          stablecoinToWei("80"),
          stablecoinToWei("80"),
          dev_account.address,
          now + txDelay
        )
      )
        .to.emit(router, "LiquidityAdded")
        .withArgs(
          pairAddress,
          stablecoinToWei("100"),
          stablecoinToWei("100"),
          stablecoinToWei("99.999")
        );
    });

    it("should be able to remove liquidty from the pool", async function () {
      await policyToken.approve(router.address, stablecoinToWei("200"));
      await usd.approve(router.address, stablecoinToWei("200"));

      now = await getLatestBlockTimestamp(ethers.provider);

      await router.addLiquidity(
        policyTokenInfo.policyTokenAddress,
        usd.address,
        stablecoinToWei("100"),
        stablecoinToWei("100"),
        stablecoinToWei("80"),
        stablecoinToWei("80"),
        dev_account.address,
        now + txDelay
      );

      await router.addLiquidity(
        policyTokenInfo.policyTokenAddress,
        usd.address,
        stablecoinToWei("100"),
        stablecoinToWei("100"),
        stablecoinToWei("80"),
        stablecoinToWei("80"),
        dev_account.address,
        now + txDelay
      );

      const NaughtyPair = await ethers.getContractFactory("NaughtyPair");
      const pair = NaughtyPair.attach(pairAddress);
      await pair.approve(router.address, stablecoinToWei("10"));

      await expect(
        router.removeLiquidity(
          policyTokenInfo.policyTokenAddress,
          usd.address,
          stablecoinToWei("10"),
          stablecoinToWei("8"),
          stablecoinToWei("8"),
          dev_account.address,
          now + txDelay
        )
      )
        .to.emit(router, "LiquidityRemoved")
        .withArgs(
          pairAddress,
          stablecoinToWei("10"),
          stablecoinToWei("10"),
          stablecoinToWei("10")
        );
    });

    it("should be able to add liquidity only with stablecoins", async function () {
      await core.setNaughtyRouter(router.address);

      await policyToken.approve(router.address, stablecoinToWei("10000"));
      await usd.approve(router.address, stablecoinToWei("10000"));
      await usd.approve(core.address, stablecoinToWei("10000"));

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

      now = await getLatestBlockTimestamp(ethers.provider);

      await expect(
        router.addLiquidityWithUSD(
          policyTokenInfo.policyTokenAddress,
          usd.address,
          stablecoinToWei("50"),
          stablecoinToWei("50"),
          stablecoinToWei("50"),
          stablecoinToWei("50"),
          dev_account.address,
          now + txDelay
        )
      ).to.emit(router, "LiquidityAdded");

      expect(await policyToken.balanceOf(dev_account.address)).to.equal(
        stablecoinToWei("10000")
      );
    });
  });

  describe("Swap Tokens", function () {
    beforeEach(async function () {
      await core.setNaughtyRouter(router.address);

      await policyToken.approve(router.address, stablecoinToWei("10000"));
      await usd.approve(router.address, stablecoinToWei("10000"));

      now = await getLatestBlockTimestamp(ethers.provider);

      await router.addLiquidity(
        policyTokenInfo.policyTokenAddress,
        usd.address,
        stablecoinToWei("100"),
        stablecoinToWei("100"),
        stablecoinToWei("80"),
        stablecoinToWei("80"),
        dev_account.address,
        now + txDelay
      );
    });
    it("should be able to swap tokens for exact tokens", async function () {
      now = await getLatestBlockTimestamp(ethers.provider);
      // Swap for 1 usd, max pay 2 policy tokens
      await router.swapTokensforExactTokens(
        stablecoinToWei("2"),
        stablecoinToWei("1"),
        policyTokenInfo.policyTokenAddress,
        usd.address,
        dev_account.address,
        now + txDelay
      );

      expect(await usd.balanceOf(dev_account.address)).to.equal(
        stablecoinToWei("89901")
      );
    });

    it("should be able to swap exact tokens for tokens", async function () {
      now = await getLatestBlockTimestamp(ethers.provider);

      await router.swapExactTokensforTokens(
        stablecoinToWei("1"),
        stablecoinToWei("0.5"),
        usd.address,
        policyTokenInfo.policyTokenAddress,
        dev_account.address,
        now + txDelay
      );

      expect(await usd.balanceOf(dev_account.address)).to.equal(
        stablecoinToWei("89899")
      );
    });
  });
  describe("Tx Fees", function () {
    let newPolicyTokenInfo: any, newPairAddress: string;
    let newPolicyTokenName: string;
    let newNPPolicyToken: NPPolicyToken;
    beforeEach(async function () {
      now = await getLatestBlockTimestamp(ethers.provider);
      deadline = now + 30000;
      settleTimestamp = now + 60000;
      // New policy token name
      newPolicyTokenName = "BTC_25000.0_L_2112";
      await core.deployPolicyToken(
        "BTC",
        usd.address,
        false,
        0,
        6,
        toWei("25000"),
        "2112",
        toBN(deadline),
        toBN(settleTimestamp)
      );

      // 50% tx fee
      // only for test
      await core.deployPool(
        newPolicyTokenName,
        usd.address,
        toBN(deadline),
        500
      );

      await core.deposit(
        newPolicyTokenName,
        usd.address,
        stablecoinToWei("10000")
      );
      await usd.mint(user1.address, stablecoinToWei("100000"));
      await core
        .connect(user1)
        .deposit(policyTokenName, usd.address, stablecoinToWei("10000"));
      await core
        .connect(user1)
        .deposit(newPolicyTokenName, usd.address, stablecoinToWei("10000"));

      newPolicyTokenInfo = await core.policyTokenInfoMapping(
        newPolicyTokenName
      );

      newPairAddress = await factory.getPairAddress(
        newPolicyTokenInfo.policyTokenAddress,
        usd.address
      );

      await usd.approve(router.address, stablecoinToWei("100000"));
      await usd
        .connect(user1)
        .approve(router.address, stablecoinToWei("100000"));
      await policyToken.approve(router.address, toWei("1000"));
      await policyToken
        .connect(user1)
        .approve(router.address, stablecoinToWei("1000"));
    });

    it("should be able to get tx fee for liquidity providers", async function () {
      now = await getLatestBlockTimestamp(ethers.provider);

      await router.addLiquidity(
        policyTokenInfo.policyTokenAddress,
        usd.address,
        stablecoinToWei("100"),
        stablecoinToWei("100"),
        stablecoinToWei("80"),
        stablecoinToWei("80"),
        dev_account.address,
        now + txDelay
      );

      NaughtyPair = await ethers.getContractFactory("NaughtyPair");
      pair = NaughtyPair.attach(pairAddress);

      let reserves = await pair.getReserves();
      console.log(
        "      reserves in pool,",
        formatStablecoin(reserves[0]),
        formatStablecoin(reserves[1])
      );

      await router
        .connect(user1)
        .swapExactTokensforTokens(
          stablecoinToWei("1"),
          stablecoinToWei("0.5"),
          usd.address,
          policyTokenInfo.policyTokenAddress,
          dev_account.address,
          now + txDelay
        );

      reserves = await pair.getReserves();
      console.log(
        "      reserves in pool,",
        formatStablecoin(reserves[0]),
        formatStablecoin(reserves[1])
      );

      await pair.approve(router.address, stablecoinToWei("1000"));
      const lp_balance = await pair.balanceOf(dev_account.address);

      const usdBalanceBefore = await usd.balanceOf(dev_account.address);
      const policyTokenBalanceBefore = await policyToken.balanceOf(
        dev_account.address
      );

      await router.removeLiquidity(
        policyTokenInfo.policyTokenAddress,
        usd.address,
        lp_balance,
        0,
        0,
        dev_account.address,
        now + txDelay
      );

      reserves = await pair.getReserves();
      console.log(
        "      reserves in pool,",
        formatStablecoin(reserves[0]),
        formatStablecoin(reserves[1])
      );

      const usdBalanceAfter = await usd.balanceOf(dev_account.address);
      const policyTokenBalanceAfter = await policyToken.balanceOf(
        dev_account.address
      );

      // (100 + 0.98x)(100 - y) = k = 10000
      // x = 1

      expect(usdBalanceAfter.sub(usdBalanceBefore)).to.equal(
        stablecoinToWei("100.998990")
      );
      expect(policyTokenBalanceAfter.sub(policyTokenBalanceBefore)).to.equal(
        stablecoinToWei("99.028520")
      );
    });
    it("should be able to get tx fee for liquidity providers with high fee rate", async function () {
      now = await getLatestBlockTimestamp(ethers.provider);

      newNPPolicyToken = NPPolicyToken.attach(
        newPolicyTokenInfo.policyTokenAddress
      );
      await newNPPolicyToken
        .connect(user1)
        .approve(router.address, stablecoinToWei("1000"));
      await newNPPolicyToken.approve(router.address, stablecoinToWei("1000"));

      await router.addLiquidity(
        newPolicyTokenInfo.policyTokenAddress,
        usd.address,
        stablecoinToWei("100"),
        stablecoinToWei("100"),
        stablecoinToWei("80"),
        stablecoinToWei("80"),
        dev_account.address,
        now + txDelay
      );

      NaughtyPair = await ethers.getContractFactory("NaughtyPair");
      pair = NaughtyPair.attach(newPairAddress);

      let reserves = await pair.getReserves();
      console.log(
        "      reserves in pool,",
        formatStablecoin(reserves[0]),
        formatStablecoin(reserves[1])
      );

      await router.swapExactTokensforTokens(
        stablecoinToWei("1"),
        stablecoinToWei("0.1"),
        usd.address,
        newPolicyTokenInfo.policyTokenAddress,
        dev_account.address,
        now + txDelay
      );

      reserves = await pair.getReserves();
      console.log(
        "      reserves in pool,",
        formatStablecoin(reserves[0]),
        formatStablecoin(reserves[1])
      );

      NaughtyPair = await ethers.getContractFactory("NaughtyPair");
      pair = NaughtyPair.attach(newPairAddress);
      await pair.approve(router.address, stablecoinToWei("1000"));
      const lp_balance = await pair.balanceOf(dev_account.address);

      const usdBalanceBefore = await usd.balanceOf(dev_account.address);
      const policyTokenBalanceBefore = await newNPPolicyToken.balanceOf(
        dev_account.address
      );

      await router.removeLiquidity(
        newPolicyTokenInfo.policyTokenAddress,
        usd.address,
        lp_balance,
        0,
        0,
        dev_account.address,
        now + txDelay
      );

      reserves = await pair.getReserves();
      console.log(
        "      reserves in pool,",
        formatStablecoin(reserves[0]),
        formatStablecoin(reserves[1])
      );

      const usdBalanceAfter = await usd.balanceOf(dev_account.address);
      const policyTokenBalanceAfter = await newNPPolicyToken.balanceOf(
        dev_account.address
      );

      expect(usdBalanceAfter.sub(usdBalanceBefore)).to.equal(
        stablecoinToWei("100.99899")
      );
      expect(policyTokenBalanceAfter.sub(policyTokenBalanceBefore)).to.equal(
        stablecoinToWei("99.501492")
      );
    });
  });
});
