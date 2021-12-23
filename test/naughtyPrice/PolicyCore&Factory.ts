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
} from "../../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  defaultAbiCoder,
  getCreate2Address,
  keccak256,
  parseUnits,
  solidityKeccak256,
  solidityPack,
} from "ethers/lib/utils";

describe("Policy Core and Naughty Factory", function () {
  let PolicyCore: PolicyCore__factory, core: PolicyCore;
  let MockUSD: MockUSD__factory, usd: MockUSD;
  let NaughtyFactory: NaughtyFactory__factory, factory: NaughtyFactory;
  let PriceGetter: PriceGetter__factory, priceGetter: PriceGetter;
  let NPPolicyToken: NPPolicyToken__factory, policyToken: NPPolicyToken;
  let NaughtyPair: NaughtyPair__factory, pair: NaughtyPair;

  let dev_account: SignerWithAddress,
    stablecoin: SignerWithAddress,
    user1: SignerWithAddress,
    emergencyPool: SignerWithAddress;

  let time: number, now: number, deadline: number, settleTimestamp: number;

  beforeEach(async function () {
    [dev_account, stablecoin, user1, emergencyPool] = await ethers.getSigners();

    MockUSD = await ethers.getContractFactory("MockUSD");
    usd = await MockUSD.deploy();
    NaughtyFactory = await ethers.getContractFactory("NaughtyFactory");
    factory = await NaughtyFactory.deploy();
    PriceGetter = await ethers.getContractFactory("PriceGetter");
    priceGetter = await PriceGetter.deploy();

    NPPolicyToken = await ethers.getContractFactory("NPPolicyToken");

    PolicyCore = await ethers.getContractFactory("PolicyCore");
    core = await PolicyCore.deploy(
      usd.address,
      factory.address,
      priceGetter.address
    );
    await core.deployed();
    await factory.deployed();

    await factory.setPolicyCoreAddress(core.address);

    time = new Date().getTime();
    now = Math.floor(time / 1000);
    deadline = now + 3000;
    settleTimestamp = now + 6000;
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
      await expect(core.addStablecoin(stablecoin.address))
        .to.emit(core, "NewStablecoinAdded")
        .withArgs(stablecoin.address);

      expect(await core.supportedStablecoin(stablecoin.address)).to.equal(true);
    });

    it("should be able to set a new lottery address", async function () {
      await expect(core.setLottery(stablecoin.address))
        .to.emit(core, "LotteryChanged")
        .withArgs(stablecoin.address);

      expect(await core.lottery()).to.equal(stablecoin.address);
    });

    it("should be able to set a new emergencyPool", async function () {
      await expect(core.setEmergencyPool(emergencyPool.address))
        .to.emit(core, "EmergencyPoolChanged")
        .withArgs(emergencyPool.address);
      expect(await core.emergencyPool()).to.equal(emergencyPool.address);
    });

    it("should be able to set the core address in factory", async function () {
      await factory.setPolicyCoreAddress(core.address);
      expect(await factory.policyCore()).to.equal(core.address);
    });
  });

  describe("Deploy tokens and pools", function () {
    it("should be able to generate correct names with decimals", async function () {
      const policyTokenName = "BTC_5.5656_L_2112";

      const token_init = defaultAbiCoder.encode(
        ["string", "string", "address"],
        [policyTokenName, policyTokenName, core.address]
      );

      // abi.encodePacked(bytecode, abi.encode(_tokenName, _tokenName, policyCore);
      const bytecode = solidityPack(
        ["bytes", "bytes"],
        [NPPolicyToken.bytecode, token_init]
      );

      const INIT_CODE_HASH = keccak256(bytecode);

      const salt = solidityKeccak256(["string"], [policyTokenName]);

      const address = getCreate2Address(factory.address, salt, INIT_CODE_HASH);

      await expect(
        core.deployPolicyToken(
          "BTC",
          false,
          4,
          parseUnits("5.5656"),
          2112,
          ethers.BigNumber.from(deadline),
          ethers.BigNumber.from(settleTimestamp)
        )
      )
        .to.emit(core, "PolicyTokenDeployed")
        .withArgs(policyTokenName, address, deadline, settleTimestamp);
    });

    it("should be able to deploy a new policy token and get the correct address", async function () {
      const policyTokenName = "BTC_24000.0_L_2112";

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

      const salt = solidityKeccak256(["string"], [policyTokenName]);

      const address = getCreate2Address(factory.address, salt, INIT_CODE_HASH);

      await expect(
        core.deployPolicyToken(
          "BTC",
          false,
          0,
          parseUnits("24000"),
          2112,
          ethers.BigNumber.from(deadline),
          ethers.BigNumber.from(settleTimestamp)
        )
      )
        .to.emit(core, "PolicyTokenDeployed")
        .withArgs(policyTokenName, address, deadline, settleTimestamp);

      // Get address from name
      const policyTokenInfo = await core.policyTokenInfoMapping(
        policyTokenName
      );
      expect(policyTokenInfo.policyTokenAddress).to.equal(address);

      // Get name from address
      expect(await core.policyTokenAddressToName(address)).to.equal(
        policyTokenName
      );

      expect(await core.allPolicyTokens(0)).to.equal(policyTokenName);
    });

    it("should be able to deploy a new pool and get the correct address", async function () {
      // Preset1: Add the stablecoin (we use default mockUSD here)
      // Preset2: Deploy a policy token
      await core.deployPolicyToken(
        "BTC",
        false,
        0,
        parseUnits("24000"),
        2112,
        ethers.BigNumber.from(deadline),
        ethers.BigNumber.from(settleTimestamp)
      );

      // Calculate the address
      const policyTokenName = "BTC_24000.0_L_2112";

      const policyTokenInfo = await core.policyTokenInfoMapping(
        policyTokenName
      );
      const policyTokenAddress = policyTokenInfo.policyTokenAddress;

      NaughtyPair = await ethers.getContractFactory("NaughtyPair");
      const INIT_CODE_HASH = keccak256(NaughtyPair.bytecode);

      const salt = solidityKeccak256(
        ["string", "string"],
        [policyTokenAddress.toLowerCase(), usd.address.toLowerCase()]
      );

      const poolAddress = getCreate2Address(
        factory.address,
        salt,
        INIT_CODE_HASH
      );

      await expect(
        core.deployPool(
          policyTokenName,
          usd.address,
          ethers.BigNumber.from(deadline)
        )
      )
        .to.emit(core, "PoolDeployed")
        .withArgs(poolAddress, policyTokenAddress, usd.address);

      const pairAddressFromFactory = await factory.getPairAddress(
        policyTokenAddress,
        usd.address
      );
      expect(pairAddressFromFactory).to.equal(poolAddress);
    });
  });
  describe("Stake and Redeem policy tokens", function () {
    let policyTokenName: string,
      policyTokenInfo: any,
      policyTokenInstance: NPPolicyToken;
    beforeEach(async function () {
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

      policyTokenInfo = await core.policyTokenInfoMapping(policyTokenName);
      policyTokenInstance = NPPolicyToken.attach(
        policyTokenInfo.policyTokenAddress
      );
    });
    it("should be able to stake usd and get policytokens", async function () {
      // dev_account deposit
      await usd.approve(core.address, parseUnits("10000"), {
        from: dev_account.address,
      });
      await core.deposit(policyTokenName, usd.address, parseUnits("10000"));

      // user1 deposit
      await usd.mint(user1.address, parseUnits("500"));
      await usd.connect(user1).approve(core.address, parseUnits("200"));
      await core
        .connect(user1)
        .deposit(policyTokenName, usd.address, parseUnits("200"));

      // Check dev_account's balance
      expect(await usd.balanceOf(dev_account.address)).to.equal(
        parseUnits("90000")
      );
      expect(await policyTokenInstance.balanceOf(dev_account.address)).to.equal(
        parseUnits("10000")
      );

      // Check user1's balance
      expect(await usd.balanceOf(user1.address)).to.equal(parseUnits("300"));
      expect(await policyTokenInstance.balanceOf(user1.address)).to.equal(
        parseUnits("200")
      );

      // get allDepositors
      expect(
        await core.allDepositors(policyTokenInfo.policyTokenAddress, 0)
      ).to.equal(dev_account.address);
      expect(
        await core.allDepositors(policyTokenInfo.policyTokenAddress, 1)
      ).to.equal(user1.address);
    });

    it("should be able to redeem usd with policy tokens", async function () {
      await usd.approve(core.address, parseUnits("10000"));
      await core.deposit(policyTokenName, usd.address, parseUnits("10000"));

      await policyTokenInstance.approve(core.address, parseUnits("5000"));
      await core.redeem(policyTokenName, usd.address, parseUnits("5000"));

      expect(await usd.balanceOf(dev_account.address)).to.equal(
        parseUnits("95000")
      );

      expect(await policyTokenInstance.balanceOf(dev_account.address)).to.equal(
        parseUnits("5000")
      );
    });
  });
});
