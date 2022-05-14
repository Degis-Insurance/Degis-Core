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
  DegisToken__factory,
  DegisToken,
  EmergencyPool,
  EmergencyPool__factory,
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
  formatStablecoin,
  getLatestBlockTimestamp,
  stablecoinToWei,
  toBN,
  toWei,
  zeroAddress,
} from "../utils";

describe("Initial Liquidity Matching", function () {
  let ILMContract: NaughtyPriceILM__factory, ILM: NaughtyPriceILM;
  let PolicyCore: PolicyCore__factory, core: PolicyCore;
  let MockUSD: MockUSD__factory, usd: MockUSD;
  let BuyerToken: BuyerToken__factory, buyerToken: BuyerToken;
  let DegisToken: DegisToken__factory, degisToken: DegisToken;
  let NaughtyFactory: NaughtyFactory__factory, factory: NaughtyFactory;
  let PriceGetter: PriceGetter__factory, priceGetter: PriceGetter;
  let PriceFeedMock: PriceFeedMock__factory, priceFeedMock: PriceFeedMock;
  let NPPolicyToken: NPPolicyToken__factory, policyToken: NPPolicyToken;
  let NaughtyPair: NaughtyPair__factory, pair: NaughtyPair;
  let NaughtyRouter: NaughtyRouter__factory, router: NaughtyRouter;
  let emergencyPool: EmergencyPool;

  let dev_account: SignerWithAddress,
    user1: SignerWithAddress,
    user2: SignerWithAddress;

  const FEE_RATE = 50;

  beforeEach(async function () {
    [dev_account, user1, user2] = await ethers.getSigners();

    // 6 decimals for usd
    MockUSD = await ethers.getContractFactory("MockUSD");
    usd = await MockUSD.deploy();

    // 18 decimals for buyer token
    BuyerToken = await ethers.getContractFactory("BuyerToken");
    buyerToken = await BuyerToken.deploy();

    DegisToken = await ethers.getContractFactory("DegisToken");
    degisToken = await DegisToken.deploy();

    NaughtyFactory = await ethers.getContractFactory("NaughtyFactory");
    factory = await NaughtyFactory.deploy();
    await factory.initialize();

    PriceGetter = await ethers.getContractFactory("PriceGetter");
    priceGetter = await PriceGetter.deploy();

    PriceFeedMock = await ethers.getContractFactory("PriceFeedMock");
    priceFeedMock = await PriceFeedMock.deploy();

    NPPolicyToken = await ethers.getContractFactory("NPPolicyToken");

    PolicyCore = await ethers.getContractFactory("PolicyCore");
    core = await PolicyCore.deploy();
    await core.initialize(usd.address, factory.address, priceFeedMock.address);

    NaughtyRouter = await ethers.getContractFactory("NaughtyRouter");
    router = await NaughtyRouter.deploy();
    await router.initialize(factory.address, buyerToken.address);
    await router.setPolicyCore(core.address);

    await factory.setPolicyCoreAddress(core.address);

    await core.setLottery(dev_account.address);
    await core.setIncomeSharing(dev_account.address);

    ILMContract = await ethers.getContractFactory("NaughtyPriceILM");
    ILM = await ILMContract.deploy();
    await ILM.deployed();

    emergencyPool = await new EmergencyPool__factory(dev_account).deploy();

    await ILM.initialize(
      degisToken.address,
      core.address,
      router.address,
      emergencyPool.address
    );

    await ILM.approveStablecoin(usd.address);

    await core.setILMContract(ILM.address);
    await core.setNaughtyRouter(router.address);

    // Mint degis token as entrance
    await degisToken.mintDegis(dev_account.address, toWei("100"));
    await degisToken.mintDegis(user1.address, toWei("100"));
    await degisToken.mintDegis(user2.address, toWei("100"));

    await degisToken.approve(ILM.address, toWei("100"));
    await degisToken.connect(user1).approve(ILM.address, toWei("100"));
    await degisToken.connect(user2).approve(ILM.address, toWei("100"));
  });

  describe("Deployment", function () {
    it("should have the correct owner", async function () {
      expect(await ILM.owner()).to.equal(dev_account.address);
    });

    it("should have the correct policy core address", async function () {
      expect(await ILM.policyCore()).to.equal(core.address);
    });
  });

  describe("Start & Stop & Use ILM", function () {
    let policyTokenName: string, tokenDecimals: number, round: string;
    let policyTokenAddress: string;
    const ILM_TIME = 86400;
    const SWAP_TIME = 86400;
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
        now + 86400 * 10,
        now + 86400 * 10
      );

      policyTokenAddress = await core.findAddressbyName(policyTokenName);
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
      ).to.be.revertedWith(customErrorMsg("'ILM__StablecoinNotSupport()'"));
    });
    it("should be able to start a new round ILM", async function () {
      const startTime = await getLatestBlockTimestamp(ethers.provider);
      const nonce = await ethers.provider.getTransactionCount(ILM.address);
      // lp token address deployed by ILM contract
      const lptokenAddress = getContractAddress({
        from: ILM.address,
        nonce: nonce,
      });
      await expect(
        ILM.startILM(policyTokenAddress, usd.address, startTime + ILM_TIME)
      )
        .to.emit(ILM, "ILMStart")
        .withArgs(
          policyTokenAddress,
          usd.address,
          startTime + ILM_TIME, // latest time stamp is startTime + 1
          lptokenAddress
        );

      const ILMPairInfo = await ILM.pairs(policyTokenAddress);

      expect(ILMPairInfo.status).to.equal(1);
      expect(ILMPairInfo.lptoken).to.equal(lptokenAddress);
      expect(ILMPairInfo.ILMDeadline).to.equal(startTime + ILM_TIME);
      expect(ILMPairInfo.amountA).to.equal(0);
      expect(ILMPairInfo.amountB).to.equal(0);

      const ILMToken_Factory: ILMToken__factory =
        await ethers.getContractFactory("ILMToken");
      const ILMToken: ILMToken = ILMToken_Factory.attach(lptokenAddress);

      expect(await ILMToken.name()).to.equal("ILM-" + policyTokenName);
      expect(await ILMToken.symbol()).to.equal("ILM-" + policyTokenName);
    });
    it("should be able to deposit into current round ILM", async function () {
      const startTime = await getLatestBlockTimestamp(ethers.provider);
      await ILM.startILM(policyTokenAddress, usd.address, startTime + ILM_TIME);
      await usd.approve(ILM.address, stablecoinToWei("200"));
      await expect(
        ILM.deposit(
          policyTokenAddress,
          usd.address,
          stablecoinToWei("100"),
          stablecoinToWei("100")
        )
      )
        .to.emit(ILM, "Deposit")
        .withArgs(
          policyTokenAddress,
          usd.address,
          stablecoinToWei("100"),
          stablecoinToWei("100")
        );

      // Pay 1degis/100USD as entrance fee
      expect(await degisToken.balanceOf(dev_account.address)).to.equal(
        toWei("98")
      );

      const ILMPairInfo = await ILM.pairs(policyTokenAddress);
      const ILMToken_Factory: ILMToken__factory =
        await ethers.getContractFactory("ILMToken");
      const ILMToken: ILMToken = ILMToken_Factory.attach(ILMPairInfo.lptoken);

      // Get lp token
      expect(await ILMToken.balanceOf(dev_account.address)).to.equal(
        stablecoinToWei("200")
      );

      // Record the amount
      const userInfo = await ILM.users(dev_account.address, policyTokenAddress);
      expect(userInfo.amountA).to.equal(stablecoinToWei("100"));
      expect(userInfo.amountB).to.equal(stablecoinToWei("100"));

      const pairInfo = await ILM.pairs(policyTokenAddress);
      expect(pairInfo.amountA).to.equal(stablecoinToWei("100"));
      expect(pairInfo.amountB).to.equal(stablecoinToWei("100"));

      // Calculate the price
      expect(await ILM.getPrice(policyTokenAddress)).to.equal(
        parseUnits("1", 12)
      );

      // Another user
      await usd.mint(user1.address, stablecoinToWei("300"));
      await usd.connect(user1).approve(ILM.address, stablecoinToWei("300"));
      await ILM.connect(user1).deposit(
        policyTokenAddress,
        usd.address,
        stablecoinToWei("200"),
        stablecoinToWei("100")
      );

      // Pay 1degis/100USD as entrance fee
      // 300 USD => 3 degis
      expect(await degisToken.balanceOf(user1.address)).to.equal(toWei("97"));

      expect(await ILMToken.balanceOf(user1.address)).to.equal(
        stablecoinToWei("300")
      );

      // Record the amount
      const userInfo_2 = await ILM.users(user1.address, policyTokenAddress);
      expect(userInfo_2.amountA).to.equal(stablecoinToWei("200"));
      expect(userInfo_2.amountB).to.equal(stablecoinToWei("100"));

      const pairInfo_2 = await ILM.pairs(policyTokenAddress);
      expect(pairInfo_2.amountA).to.equal(stablecoinToWei("300"));
      expect(pairInfo_2.amountB).to.equal(stablecoinToWei("200"));

      // Calculate the price
      expect(await ILM.getPrice(policyTokenAddress)).to.equal(
        parseUnits("1.5", 12)
      );

      // related to degis
      expect(pairInfo_2.accDegisPerShare).to.equal(parseUnits("0.025", 24));
      expect(userInfo_2.degisDebt).to.equal(parseUnits("7.5", 18));
    });

    it("should be able to withdraw from current round ILM", async function () {
      const startTime = await getLatestBlockTimestamp(ethers.provider);
      await ILM.startILM(policyTokenAddress, usd.address, startTime + ILM_TIME);
      await usd.approve(ILM.address, stablecoinToWei("200"));
      await ILM.deposit(
        policyTokenAddress,
        usd.address,
        stablecoinToWei("100"),
        stablecoinToWei("100")
      );

      const ILMPairInfo = await ILM.pairs(policyTokenAddress);
      const ILMToken_Factory: ILMToken__factory =
        await ethers.getContractFactory("ILMToken");
      const ILMToken: ILMToken = ILMToken_Factory.attach(ILMPairInfo.lptoken);

      // Get lp token
      expect(await ILMToken.balanceOf(dev_account.address)).to.equal(
        stablecoinToWei("200")
      );

      // Record the amount
      const userInfo = await ILM.users(dev_account.address, policyTokenAddress);
      expect(userInfo.amountA).to.equal(stablecoinToWei("100"));
      expect(userInfo.amountB).to.equal(stablecoinToWei("100"));

      const pairInfo = await ILM.pairs(policyTokenAddress);
      expect(pairInfo.amountA).to.equal(stablecoinToWei("100"));
      expect(pairInfo.amountB).to.equal(stablecoinToWei("100"));

      // Calculate the price
      expect(await ILM.getPrice(policyTokenAddress)).to.equal(
        parseUnits("1", 12)
      );

      // Another user
      await expect(
        ILM.withdraw(
          policyTokenAddress,
          usd.address,
          stablecoinToWei("20"),
          stablecoinToWei("60")
        )
      )
        .to.emit(ILM, "Withdraw")
        .withArgs(
          policyTokenAddress,
          usd.address,
          dev_account.address,
          stablecoinToWei("20"),
          stablecoinToWei("60")
        );

      expect(await ILMToken.balanceOf(dev_account.address)).to.equal(
        stablecoinToWei("120")
      );

      // Record the amount
      const userInfo_2 = await ILM.users(
        dev_account.address,
        policyTokenAddress
      );
      expect(userInfo_2.amountA).to.equal(stablecoinToWei("80"));
      expect(userInfo_2.amountB).to.equal(stablecoinToWei("40"));

      const pairInfo_2 = await ILM.pairs(policyTokenAddress);
      expect(pairInfo_2.amountA).to.equal(stablecoinToWei("80"));
      expect(pairInfo_2.amountB).to.equal(stablecoinToWei("40"));

      // Calculate the price
      expect(await ILM.getPrice(policyTokenAddress)).to.equal(
        parseUnits("2", 12)
      );
    });

    it("should be able to stop current round ILM", async function () {
      const initTime = await getLatestBlockTimestamp(ethers.provider);
      await ILM.startILM(policyTokenAddress, usd.address, initTime + ILM_TIME);
      const startTime = await getLatestBlockTimestamp(ethers.provider);

      await expect(
        ILM.finishILM(policyTokenAddress, SWAP_TIME, FEE_RATE)
      ).to.be.revertedWith(customErrorMsg("'ILM__RoundNotOver()'"));

      const deadlineForPolicyToken = (
        await core.policyTokenInfoMapping(policyTokenName)
      ).deadline;

      await setNextBlockTime(initTime + ILM_TIME + 100);
      await expect(
        ILM.finishILM(policyTokenAddress, deadlineForPolicyToken, FEE_RATE)
      ).to.be.revertedWith(customErrorMsg("'ILM__NoDeposit()'"));

      // Deposit some usd
      await usd.approve(ILM.address, stablecoinToWei("200"));
      await ILM.deposit(
        policyTokenAddress,
        usd.address,
        stablecoinToWei("100"),
        stablecoinToWei("100")
      );
      await expect(
        ILM.finishILM(policyTokenAddress, deadlineForPolicyToken, FEE_RATE)
      ).to.emit(ILM, "ILMFinish");

      const naughtyPairAddress = await factory.getPairAddress(
        policyTokenAddress,
        usd.address
      );
      NaughtyPair = await ethers.getContractFactory("NaughtyPair");
      const naughtyPair = NaughtyPair.attach(naughtyPairAddress);

      const reserves = await naughtyPair.getReserves();
      expect(reserves[0]).to.equal(stablecoinToWei("100"));
      expect(reserves[1]).to.equal(stablecoinToWei("100"));

      // Other normal user can interact with router
      NPPolicyToken = await ethers.getContractFactory("NPPolicyToken");
      policyToken = NPPolicyToken.attach(policyTokenAddress);
      await usd.approve(core.address, stablecoinToWei("1000"));
      await core.deposit(policyTokenName, usd.address, stablecoinToWei("1000"));
      await policyToken.approve(router.address, stablecoinToWei("1000"));
      await usd.approve(router.address, stablecoinToWei("1000"));
      const currentTime = await getLatestBlockTimestamp(ethers.provider);

      await expect(
        router.addLiquidity(
          policyTokenAddress,
          usd.address,
          stablecoinToWei("100"),
          stablecoinToWei("100"),
          stablecoinToWei("80"),
          stablecoinToWei("80"),
          dev_account.address,
          currentTime + 300
        )
      ).to.emit(router, "LiquidityAdded");

      await router.swapTokensforExactTokens(
        stablecoinToWei("2"),
        stablecoinToWei("1"),
        policyTokenAddress,
        usd.address,
        dev_account.address,
        currentTime + 300
      );
    });

    it("should be able to claim back liquidity by ILM contract", async function () {
      // Start ILM
      const startTime = await getLatestBlockTimestamp(ethers.provider);
      await ILM.startILM(policyTokenAddress, usd.address, startTime + ILM_TIME);

      // Two users deposit liquidity
      await usd.approve(ILM.address, stablecoinToWei("200"));
      await ILM.deposit(
        policyTokenAddress,
        usd.address,
        stablecoinToWei("100"),
        stablecoinToWei("100")
      );

      await usd.mint(user1.address, stablecoinToWei("200"));
      await usd.connect(user1).approve(ILM.address, stablecoinToWei("200"));
      await ILM.connect(user1).deposit(
        policyTokenAddress,
        usd.address,
        stablecoinToWei("100"),
        stablecoinToWei("100")
      );

      // Finish ILM and put liquidity into swap pool
      const deadlineForPolicyToken = (
        await core.policyTokenInfoMapping(policyTokenName)
      ).deadline;
      await setNextBlockTime(startTime + ILM_TIME + 100);
      await ILM.finishILM(policyTokenAddress, deadlineForPolicyToken, FEE_RATE);

      const naughtyPairAddress = await factory.getPairAddress(
        policyTokenAddress,
        usd.address
      );
      NaughtyPair = await ethers.getContractFactory("NaughtyPair");
      const naughtyPair = NaughtyPair.attach(naughtyPairAddress);

      const reserves = await naughtyPair.getReserves();
      expect(reserves[0]).to.equal(stablecoinToWei("200"));
      expect(reserves[1]).to.equal(stablecoinToWei("200"));

      // Claim back ILM liquidity
      await ILM.claim(
        policyTokenAddress,
        usd.address,
        stablecoinToWei("200"),
        stablecoinToWei("80"), // Slippage
        stablecoinToWei("80") // Slippage
      );

      NPPolicyToken = await ethers.getContractFactory("NPPolicyToken");
      policyToken = NPPolicyToken.attach(policyTokenAddress);

      const bal1 = await policyToken.balanceOf(dev_account.address);
      console.log(
        "policy token balance of dev_account: ",
        formatStablecoin(bal1.toString())
      );
      expect(bal1.gt(stablecoinToWei("99.9"))).to.be.true;
      const bal2 = await usd.balanceOf(dev_account.address);
      console.log(
        "usd balance of dev_account: ",
        formatStablecoin(bal2.toString())
      );
      expect(bal2.gt(stablecoinToWei("99899"))).to.be.true;

      // expect(
      //   await policyToken.balanceOf(dev_account.address)
      // ).to.be.greaterThanOrEqual(stablecoinToWei("99"));
      // expect(await usd.balanceOf(dev_account.address)).to.be.greaterThanOrEqual(
      //   stablecoinToWei("99899")
      // );
    });

    it("should be able to get degis token fee when withdraw", async function () {
      const startTime = await getLatestBlockTimestamp(ethers.provider);
      await ILM.startILM(policyTokenAddress, usd.address, startTime + ILM_TIME);
      await usd.approve(ILM.address, stablecoinToWei("200"));
      await ILM.deposit(
        policyTokenAddress,
        usd.address,
        stablecoinToWei("100"),
        stablecoinToWei("100")
      );

      expect(await degisToken.balanceOf(dev_account.address)).to.equal(
        toWei("98")
      );

      await usd.mint(user1.address, stablecoinToWei("200"));
      await usd.connect(user1).approve(ILM.address, stablecoinToWei("200"));
      await ILM.connect(user1).deposit(
        policyTokenAddress,
        usd.address,
        stablecoinToWei("100"),
        stablecoinToWei("100")
      );

      expect(await degisToken.balanceOf(user1.address)).to.equal(toWei("98"));

      await usd.mint(user2.address, stablecoinToWei("100"));
      await usd.connect(user2).approve(ILM.address, stablecoinToWei("100"));
      await ILM.connect(user2).deposit(
        policyTokenAddress,
        usd.address,
        stablecoinToWei("50"),
        stablecoinToWei("50")
      );

      expect(await degisToken.balanceOf(user2.address)).to.equal(toWei("99"));

      await ILM.withdraw(
        policyTokenAddress,
        usd.address,
        stablecoinToWei("100"),
        stablecoinToWei("100")
      );
      // Withdraw will not return degis token
      expect(await degisToken.balanceOf(dev_account.address)).to.equal(
        toWei("98")
      );
      expect(await degisToken.balanceOf(emergencyPool.address)).to.equal(
        toWei("4.5")
      );

      await ILM.connect(user1).withdraw(
        policyTokenAddress,
        usd.address,
        stablecoinToWei("100"),
        stablecoinToWei("100")
      );
      // Withdraw will not return degis token
      expect(await degisToken.balanceOf(user1.address)).to.equal(toWei("98"));
      expect(await degisToken.balanceOf(emergencyPool.address)).to.equal(
        toWei("5")
      );

      await ILM.connect(user2).withdraw(
        policyTokenAddress,
        usd.address,
        stablecoinToWei("50"),
        stablecoinToWei("50")
      );
      // Withdraw will not return degis token
      expect(await degisToken.balanceOf(user2.address)).to.equal(toWei("99"));
      expect(await degisToken.balanceOf(emergencyPool.address)).to.equal(
        toWei("5")
      );
    });

    it("should be able to get degis fee when claim", async function () {
      const startTime = await getLatestBlockTimestamp(ethers.provider);
      await ILM.startILM(policyTokenAddress, usd.address, startTime + ILM_TIME);
      await usd.approve(ILM.address, stablecoinToWei("200"));
      await ILM.deposit(
        policyTokenAddress,
        usd.address,
        stablecoinToWei("100"),
        stablecoinToWei("100")
      );

      expect(await degisToken.balanceOf(dev_account.address)).to.equal(
        toWei("98")
      );

      await usd.mint(user1.address, stablecoinToWei("200"));
      await usd.connect(user1).approve(ILM.address, stablecoinToWei("200"));
      await ILM.connect(user1).deposit(
        policyTokenAddress,
        usd.address,
        stablecoinToWei("100"),
        stablecoinToWei("100")
      );

      expect(await degisToken.balanceOf(user1.address)).to.equal(toWei("98"));

      await usd.mint(user2.address, stablecoinToWei("100"));
      await usd.connect(user2).approve(ILM.address, stablecoinToWei("100"));
      await ILM.connect(user2).deposit(
        policyTokenAddress,
        usd.address,
        stablecoinToWei("50"),
        stablecoinToWei("50")
      );

      expect(await degisToken.balanceOf(user2.address)).to.equal(toWei("99"));

      await setNextBlockTime(startTime + ILM_TIME + 100);
      const deadlineForPolicyToken = (
        await core.policyTokenInfoMapping(policyTokenName)
      ).deadline;
      await ILM.finishILM(policyTokenAddress, deadlineForPolicyToken, FEE_RATE);

      await ILM.claim(
        policyTokenAddress,
        usd.address,
        stablecoinToWei("100"),
        0,
        0
      );
      // Withdraw will not return degis token
      expect(await degisToken.balanceOf(dev_account.address)).to.equal(
        toWei("102.5")
      );
      expect(await degisToken.balanceOf(emergencyPool.address)).to.equal(
        toWei("0")
      );
      const userInfo_dev_1 = await ILM.users(
        dev_account.address,
        policyTokenAddress
      );
      expect(userInfo_dev_1.degisDebt).to.equal(toWei("4.5"));

      await ILM.claim(
        policyTokenAddress,
        usd.address,
        stablecoinToWei("100"),
        0,
        0
      );
      // Withdraw will not return degis token
      expect(await degisToken.balanceOf(dev_account.address)).to.equal(
        toWei("102.5")
      );
      expect(await degisToken.balanceOf(emergencyPool.address)).to.equal(
        toWei("0")
      );
      const userInfo_dev_2 = await ILM.users(
        dev_account.address,
        policyTokenAddress
      );
      expect(userInfo_dev_2.degisDebt).to.equal(toWei("4.5"));

      await ILM.connect(user1).claim(
        policyTokenAddress,
        usd.address,
        stablecoinToWei("200"),
        0,
        0
      );
      // Withdraw will not return degis token
      expect(await degisToken.balanceOf(user1.address)).to.equal(toWei("98.5"));
      expect(await degisToken.balanceOf(emergencyPool.address)).to.equal(
        toWei("0")
      );
      const userInfo_1 = await ILM.users(user1.address, policyTokenAddress);
      expect(userInfo_1.degisDebt).to.equal(toWei("4.5"));

      await ILM.connect(user2).claim(
        policyTokenAddress,
        usd.address,
        stablecoinToWei("100"),
        0,
        0
      );
      // Withdraw will not return degis token
      expect(await degisToken.balanceOf(user2.address)).to.equal(toWei("99"));
      expect(await degisToken.balanceOf(emergencyPool.address)).to.equal(
        toWei("0")
      );
      const userInfo_2 = await ILM.users(user2.address, policyTokenAddress);
      expect(userInfo_2.degisDebt).to.equal(toWei("2.25"));

      const quota = await core.getUserQuota(
        dev_account.address,
        policyTokenAddress
      );
      console.log(quota);
      expect(quota).to.equal(stablecoinToWei("99.9996"));
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
