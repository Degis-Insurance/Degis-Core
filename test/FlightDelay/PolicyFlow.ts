import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { parseUnits } from "ethers/lib/utils";
import { ethers } from "hardhat";
import {
  BuyerToken,
  BuyerToken__factory,
  FDPolicyToken,
  FDPolicyToken__factory,
  FlightOracle,
  FlightOracle__factory,
  InsurancePool,
  InsurancePool__factory,
  MockUSD,
  MockUSD__factory,
  PolicyFlow,
  PolicyFlow__factory,
  SigManager,
  SigManager__factory,
} from "../../typechain";

describe("Policy Flow", function () {
  let dev_account: SignerWithAddress,
    user1: SignerWithAddress,
    emergencyPool: SignerWithAddress,
    lottery: SignerWithAddress;

  let PolicyFlow: PolicyFlow__factory, flow: PolicyFlow;
  let InsurancePool: InsurancePool__factory, pool: InsurancePool;
  let FlightOracle: FlightOracle__factory, oracle: FlightOracle;
  let FDPolicyToken: FDPolicyToken__factory, policyToken: FDPolicyToken;
  let BuyerToken: BuyerToken__factory, buyerToken: BuyerToken;
  let SigManager: SigManager__factory, sig: SigManager;
  let MockUSD: MockUSD__factory, usd: MockUSD;

  beforeEach(async function () {
    [dev_account, user1, emergencyPool, lottery] = await ethers.getSigners();

    MockUSD = await ethers.getContractFactory("MockUSD");
    usd = await MockUSD.deploy();

    SigManager = await ethers.getContractFactory("SigManager");
    sig = await SigManager.deploy();

    InsurancePool = await ethers.getContractFactory("InsurancePool");
    pool = await InsurancePool.deploy(
      emergencyPool.address,
      lottery.address,
      usd.address
    );

    BuyerToken = await ethers.getContractFactory("BuyerToken");
    buyerToken = await BuyerToken.deploy();

    FDPolicyToken = await ethers.getContractFactory("FDPolicyToken");
    policyToken = await FDPolicyToken.deploy();

    PolicyFlow = await ethers.getContractFactory("PolicyFlow");
    flow = await PolicyFlow.deploy(
      pool.address,
      policyToken.address,
      sig.address,
      buyerToken.address
    );

    const link_mainnet = "0x514910771AF9Ca656af840dff83E8264EcF986CA";
    FlightOracle = await ethers.getContractFactory("FlightOracle");
    oracle = await FlightOracle.deploy(flow.address, link_mainnet);

    await flow.deployed();
  });

  describe("Deployment", function () {
    it("should have the correct owner", async function () {
      expect(await flow.owner()).to.equal(dev_account.address);
    });

    it("should have the initial flight status url", async function () {
      expect(await flow.FLIGHT_STATUS_URL()).to.equal(
        "https://18.163.254.50:3207/flight_status?"
      );
    });

    it("should have the correct initial fee", async function () {
      expect(await flow.fee()).to.equal(0);
    });

    it("should have the correct inital policy amount", async function () {
      expect(await flow.totalPolicies()).to.equal(0);
    });
  });

  describe("Owner Functions", function () {
    it("should be able to change the fee", async function () {
      await expect(flow.changeFee(parseUnits("1")))
        .to.emit(flow, "FeeChanged")
        .withArgs(parseUnits("1"));
    });

    it("should be able to change the max payoff", async function () {
      await expect(flow.changeMaxPayoff(parseUnits("400")))
        .to.emit(flow, "MaxPayoffChanged")
        .withArgs(parseUnits("400"));
    });

    it("should be able to change the min departure time", async function () {
      // 2 days
      const newMinTime = 24 * 3600 * 2;
      await expect(flow.changeMinTimeBeforeDeparture(newMinTime))
        .to.emit(flow, "MinTimeBeforeDepartureChanged")
        .withArgs(newMinTime);
    });

    it("should be able to change the oracle address", async function () {
      await expect(flow.setFlightOracle(dev_account.address))
        .to.emit(flow, "FlightOracleChanged")
        .withArgs(dev_account.address);
    });

    it("should be able to change the flight status url", async function () {
      await expect(flow.setURL("google.com"))
        .to.emit(flow, "OracleUrlChanged")
        .withArgs("google.com");
    });
  });
});
