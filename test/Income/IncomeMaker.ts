import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  BuyerToken,
  BuyerToken__factory,
  DegisToken,
  DegisToken__factory,
  FarmingPoolUpgradeable,
  FarmingPoolUpgradeable__factory,
  IncomeMaker,
  IncomeMaker__factory,
  IncomeSharingVault,
  IncomeSharingVault__factory,
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
  VoteEscrowedDegis,
  VoteEscrowedDegis__factory,
} from "../../typechain";

import {
  formatStablecoin,
  getLatestBlockTimestamp,
  stablecoinToWei,
  toBN,
  toWei,
} from "../utils";

describe("Income Maker", function () {
  let NaughtyRouter: NaughtyRouter__factory, router: NaughtyRouter;
  let MockUSD: MockUSD__factory, usd: MockUSD;
  let PriceGetter: PriceGetter__factory, priceGetter: PriceGetter;
  let PolicyCore: PolicyCore__factory, core: PolicyCore;
  let factory: NaughtyFactory;
  let BuyerToken: BuyerToken__factory, buyerToken: BuyerToken;
  let NPPolicyToken: NPPolicyToken__factory, policyToken: NPPolicyToken;
  let NaughtyPair: NaughtyPair__factory, pair: NaughtyPair;
  let incomeMaker: IncomeMaker;
  let incomeSharingVault: IncomeSharingVault;
  let veDEG: VoteEscrowedDegis;
  let degis: DegisToken;
  let farmingPool: FarmingPoolUpgradeable;

  let dev_account: SignerWithAddress,
    user1: SignerWithAddress,
    user2: SignerWithAddress;

  let now: number, deadline: number, settleTimestamp: number;
  let policyTokenName: string, policyTokenInfo: any;
  let pairAddress: string;

  const txDelay = 60000;

  before(async function () {});

  beforeEach(async function () {
    [dev_account, user1, user2] = await ethers.getSigners();

    buyerToken = await new BuyerToken__factory(dev_account).deploy();

    factory = await new NaughtyFactory__factory(dev_account).deploy();
    await factory.initialize();

    usd = await new MockUSD__factory(dev_account).deploy();
    degis = await new DegisToken__factory(dev_account).deploy();

    priceGetter = await new PriceGetter__factory(dev_account).deploy();

    farmingPool = await new FarmingPoolUpgradeable__factory(
      dev_account
    ).deploy();
    await farmingPool.initialize(degis.address);

    veDEG = await new VoteEscrowedDegis__factory(dev_account).deploy();
    await veDEG.initialize(degis.address, farmingPool.address);

    // Deploy naughty router
    router = await new NaughtyRouter__factory(dev_account).deploy();
    await router.deployed();
    await router.initialize(factory.address, buyerToken.address);
    await buyerToken.addMinter(router.address);

    // Deploy policy core
    core = await new PolicyCore__factory(dev_account).deploy();
    await core.deployed();
    await core.initialize(usd.address, factory.address, priceGetter.address);

    await router.setPolicyCore(core.address);
    await factory.setPolicyCoreAddress(core.address);

    incomeSharingVault = await new IncomeSharingVault__factory(
      dev_account
    ).deploy();
    await incomeSharingVault.initialize(veDEG.address);

    incomeMaker = await new IncomeMaker__factory(dev_account).deploy();
    await incomeMaker.initialize(
      router.address,
      factory.address,
      incomeSharingVault.address
    );

    NPPolicyToken = await ethers.getContractFactory("NPPolicyToken");

    await factory.setIncomeMakerAddress(incomeMaker.address);
  });

  describe("Get transaction fee in income maker", async function () {
    let policyTokenName: string;
    let feeRate = 50;
    beforeEach(async function () {
      policyTokenName = "BTC_20000.0_L_2201";
      const now = await getLatestBlockTimestamp(ethers.provider);

      await core.deployPolicyToken(
        "BTC",
        usd.address,
        false,
        0,
        6,
        toWei("20000"),
        "2201",
        now + 60000,
        now + 90000
      );

      await core.deployPool(policyTokenName, usd.address, now + 60000, feeRate);

      await usd.approve(core.address, stablecoinToWei("20000"));
      await core.deposit(policyTokenName, usd.address, stablecoinToWei("1000"));
    });

    it("should be able to get transaction fee", async function () {
      const policyTokenInfo = await core.policyTokenInfoMapping(
        policyTokenName
      );
      const now = await getLatestBlockTimestamp(ethers.provider);
      policyToken = NPPolicyToken.attach(policyTokenInfo.policyTokenAddress);
      await usd.approve(router.address, stablecoinToWei("1000"));
      await policyToken.approve(router.address, stablecoinToWei("1000"));

      await router.addLiquidity(
        policyTokenInfo.policyTokenAddress,
        usd.address,
        stablecoinToWei("100"),
        stablecoinToWei("100"),
        stablecoinToWei("100"),
        stablecoinToWei("100"),
        dev_account.address,
        now + 60
      );

      // feerate = 5%
      // total fee ≈ 0.5 ≈ 0.2(income maker) + 0.3(lp)
      await router.swapExactTokensforTokens(
        stablecoinToWei("10"),
        stablecoinToWei("2"),
        usd.address,
        policyTokenInfo.policyTokenAddress,
        dev_account.address,
        now + 120
      );

      const pairAddress = await factory.getPairAddress(
        policyTokenInfo.policyTokenAddress,
        usd.address
      );
      const pair = new NaughtyPair__factory(dev_account).attach(pairAddress);
      const lpBalance = await pair.balanceOf(dev_account.address);

      await pair.approve(router.address, stablecoinToWei("1000"));

      const usdBalanceBefore = await usd.balanceOf(dev_account.address);
      const policyBalanceBefore = await policyToken.balanceOf(
        dev_account.address
      );

      await router.removeLiquidity(
        policyTokenInfo.policyTokenAddress,
        usd.address,
        lpBalance,
        stablecoinToWei("2"),
        stablecoinToWei("2"),
        dev_account.address,
        now + 180
      );

      const usdBalanceAfter = await usd.balanceOf(dev_account.address);
      const policyBalanceAfter = await policyToken.balanceOf(
        dev_account.address
      );

      console.log("lp balance", lpBalance.toNumber());

      // Fee : 5%
      // 2% to income maker, 3% to lp
      expect(usdBalanceAfter.sub(usdBalanceBefore)).to.equal(
        stablecoinToWei("109.898787")
      );
      expect(policyBalanceAfter.sub(policyBalanceBefore)).to.equal(
        stablecoinToWei("91.240172")
      ); // + 1.2
      expect(await pair.balanceOf(incomeMaker.address)).to.equal(
        stablecoinToWei("0.091095")
      );

      // Convert income to stablecoins
      await incomeMaker.convertIncome(
        policyTokenInfo.policyTokenAddress,
        usd.address
      );
      expect(await policyToken.balanceOf(incomeMaker.address)).to.equal(0);
      expect(await usd.balanceOf(incomeMaker.address)).to.equal(0);
      // The liquidity has been removed nearly all, so the amount is somehow smaller
      expect(await usd.balanceOf(incomeSharingVault.address)).to.equal(
        stablecoinToWei("0.1012")
      );
    });
  });
});
