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
} from "../../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  defaultAbiCoder,
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

  let dev_account: SignerWithAddress;

  beforeEach(async function () {
    [dev_account] = await ethers.getSigners();

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
    ILM = await ILMContract.deploy(core.address);
  });
});

// hre can be used in hardhat environment but not with mocha built-in test
async function setNextBlockTime(time: number) {
  await hre.network.provider.request({
    method: "evm_setNextBlockTimestamp",
    params: [time],
  });
}
