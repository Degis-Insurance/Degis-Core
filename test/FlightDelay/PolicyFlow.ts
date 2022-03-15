import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import {
  arrayify,
  formatEther,
  keccak256,
  solidityKeccak256,
  toUtf8Bytes,
} from "ethers/lib/utils";
import { ethers } from "hardhat";
import {
  BuyerToken,
  BuyerToken__factory,
  EmergencyPool__factory,
  EmergencyPool,
  FDPolicyToken,
  FDPolicyToken__factory,
  FlightOracleMock,
  FlightOracleMock__factory,
  InsurancePool,
  InsurancePool__factory,
  MockUSD,
  MockUSD__factory,
  PolicyFlow,
  PolicyFlow__factory,
  SigManager,
  SigManager__factory,
  DegisLottery__factory,
  DegisLottery,
} from "../../typechain";
import {
  formatStablecoin,
  getLatestBlockTimestamp,
  stablecoinToWei,
  toBN,
  toWei,
} from "../utils";
import { deployments } from "hardhat";

describe("Policy Flow", function () {
  let dev_account: SignerWithAddress,
    user1: SignerWithAddress,
    deg: SignerWithAddress,
    rand: SignerWithAddress;

  let PolicyFlow: PolicyFlow__factory, flow: PolicyFlow;
  let InsurancePool: InsurancePool__factory, pool: InsurancePool;
  let EmergencyPool: EmergencyPool__factory, emergencyPool: EmergencyPool;
  let Lottery: DegisLottery__factory, lottery: DegisLottery;
  let FlightOracleMock: FlightOracleMock__factory, oracleMock: FlightOracleMock;
  let FDPolicyToken: FDPolicyToken__factory, policyToken: FDPolicyToken;
  let BuyerToken: BuyerToken__factory, buyerToken: BuyerToken;
  let SigManager: SigManager__factory, sig: SigManager;
  let MockUSD: MockUSD__factory, usd: MockUSD;

  beforeEach(async function () {
    [dev_account, user1, deg, rand] = await ethers.getSigners();

    MockUSD = await ethers.getContractFactory("MockUSD");
    usd = await MockUSD.deploy();

    SigManager = await ethers.getContractFactory("SigManager");
    sig = await SigManager.deploy();

    EmergencyPool = await ethers.getContractFactory("EmergencyPool");
    emergencyPool = await EmergencyPool.deploy();

    Lottery = await ethers.getContractFactory("DegisLottery");
    lottery = await Lottery.deploy(deg.address, usd.address, rand.address);

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
    flow = await PolicyFlow.deploy();
    await flow.deployed();

    // It is behind proxy, so use initialize
    await flow.initialize(
      pool.address,
      policyToken.address,
      sig.address,
      buyerToken.address
    );

    FlightOracleMock = await ethers.getContractFactory("FlightOracleMock");
    oracleMock = await FlightOracleMock.deploy(flow.address);
    await oracleMock.deployed();

    // Preparations:
    await usd.approve(pool.address, stablecoinToWei("10000"));
    await pool.stake(stablecoinToWei("1000"));
    await pool.setPolicyFlow(flow.address);
    await policyToken.updatePolicyFlow(flow.address);
    await buyerToken.addMinter(flow.address);
    await lottery.setOperatorAddress(pool.address);
  });

  describe("Deployment", function () {
    it("should have the correct owner", async function () {
      expect(await flow.owner()).to.equal(dev_account.address);
    });

    it("should have the initial flight status url", async function () {
      expect(await flow.FLIGHT_STATUS_URL()).to.equal(
        "https://degis.io:3207/flight_status?"
      );
    });

    it("should have the correct initial fee", async function () {
      expect(await flow.fee()).to.equal(toWei("0.1"));
    });

    it("should have the correct inital policy amount", async function () {
      expect(await flow.totalPolicies()).to.equal(0);
    });
  });

  describe("Owner Functions", function () {
    it("should be able to change the fee", async function () {
      await expect(flow.setFee(toWei("1")))
        .to.emit(flow, "FeeChanged")
        .withArgs(toWei("1"));
    });

    it("should be able to change the max payoff", async function () {
      await expect(flow.setMaxPayoff(stablecoinToWei("400")))
        .to.emit(flow, "MaxPayoffChanged")
        .withArgs(stablecoinToWei("400"));
    });

    it("should be able to change the min departure time", async function () {
      // 2 days
      const newMinTime = 24 * 3600 * 2;
      await expect(flow.setMinTimeBeforeDeparture(newMinTime))
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

    it("should be able to change the delay threshold", async function () {
      await expect(flow.setDelayThreshold(15, 150))
        .to.emit(flow, "DelayThresholdChanged")
        .withArgs(15, 150);
    });
  });

  describe("Main Functions", function () {
    let productId: number;
    let flightNumber: string;
    let now: number;

    beforeEach(async function () {
      productId = 0;
      flightNumber = "AQ1299";
      now = await getLatestBlockTimestamp(ethers.provider);
    });

    it("should be able to buy a policy", async function () {
      await sig.addSigner(dev_account.address);

      const _SUBMIT_CLAIM_TYPEHASH = keccak256(
        toUtf8Bytes("5G is great, physical lab is difficult to find")
      );

      const departureTime = now + 48 * 3600;
      const landingTime = now + 50 * 3600;
      const hashedFlightNumber = keccak256(toUtf8Bytes(flightNumber));
      const premium = stablecoinToWei("10");
      const deadline = now + 30000;

      const hasedInfo = solidityKeccak256(
        [
          "bytes",
          "bytes",
          "uint256",
          "uint256",
          "address",
          "uint256",
          "uint256",
        ],
        [
          _SUBMIT_CLAIM_TYPEHASH,
          hashedFlightNumber,
          departureTime,
          landingTime,
          dev_account.address,
          premium.toString(),
          deadline,
        ]
      );

      const signature = await dev_account.signMessage(arrayify(hasedInfo));

      // console.log("signature: ", signature);

      const policyId = await flow.totalPolicies();

      await expect(
        flow.newApplication(
          productId,
          flightNumber,
          premium,
          toBN(departureTime),
          toBN(landingTime),
          deadline,
          signature
        )
      )
        .to.emit(flow, "NewPolicyApplication")
        .withArgs(policyId.toNumber() + 1, dev_account.address);

      await expect(
        flow.newApplication(
          productId + 1,
          flightNumber,
          premium,
          toBN(departureTime),
          toBN(landingTime),
          deadline,
          signature
        )
      ).to.be.revertedWith("You are calling the wrong product contract");

      await expect(
        flow.newApplication(
          productId,
          flightNumber,
          premium,
          toBN(departureTime),
          toBN(landingTime),
          now - 2000,
          signature
        )
      ).to.be.revertedWith("Expired deadline, please resubmit a transaction");

      await expect(
        flow.newApplication(
          productId,
          flightNumber,
          premium,
          toBN(now),
          toBN(now + 50 * 3600),
          deadline,
          signature
        )
      ).to.be.revertedWith(
        "It's too close to the departure time, you cannot buy this policy"
      );
    });
  });

  describe("Policy Settlement", function () {
    let flightNumber: string,
      departureTime: number,
      landingTime: number,
      policyId: number,
      premium: number;

    let now: number, url: string;

    beforeEach(async function () {
      await flow.setFlightOracle(oracleMock.address);

      const productId = 0;
      flightNumber = "AQ1299";

      now = await getLatestBlockTimestamp(ethers.provider);

      await sig.addSigner(dev_account.address);

      const _SUBMIT_CLAIM_TYPEHASH = keccak256(
        toUtf8Bytes("5G is great, physical lab is difficult to find")
      );
      departureTime = now + 48 * 3600;
      landingTime = now + 50 * 3600;
      const hashedFlightNumber = keccak256(toUtf8Bytes(flightNumber));
      premium = 10;
      const deadline = now + 30000;
      const hasedInfo = solidityKeccak256(
        [
          "bytes",
          "bytes",
          "uint256",
          "uint256",
          "address",
          "uint256",
          "uint256",
        ],
        [
          _SUBMIT_CLAIM_TYPEHASH,
          hashedFlightNumber,
          departureTime,
          landingTime,
          dev_account.address,
          stablecoinToWei(premium.toString()),
          deadline,
        ]
      );

      const signature = await dev_account.signMessage(arrayify(hasedInfo));

      await flow.newApplication(
        productId,
        flightNumber,
        stablecoinToWei(premium.toString()),
        toBN(departureTime),
        toBN(landingTime),
        deadline,
        signature
      );

      policyId = (await flow.totalPolicies()).toNumber();

      url =
        "https://degis.io:3207/flight_status?" +
        "flight_no=" +
        flightNumber +
        "&timestamp=" +
        departureTime;
    });

    it("should be able to settle a policy for no delay", async function () {
      // Delay result to be 0: no delay
      const delayResult = 0;
      await oracleMock.setResult(delayResult);
      expect(await oracleMock.delayResult()).to.equal(delayResult);

      const requestId = solidityKeccak256(
        ["uint256", "string", "string", "uint256"],
        [toWei("0.1"), url, "delay", 1]
      );

      await setNextBlockTime(landingTime);

      await expect(
        flow.newClaimRequest(
          policyId,
          flightNumber,
          departureTime.toString(),
          "delay",
          false
        )
      )
        .to.emit(flow, "NewClaimRequest")
        .withArgs(policyId, flightNumber, requestId);

      await expect(oracleMock.fulfill(requestId))
        .to.emit(flow, "FulfilledOracleRequest")
        .withArgs(policyId, requestId);

      const policyTokenInfo = await flow.policyList(policyId);

      expect(policyTokenInfo.alreadySettled).to.equal(true);
      expect(policyTokenInfo.delayResult).to.equal(delayResult);

      expect(await pool.activePremiums()).to.equal(0);
      expect(await pool.totalStakingBalance()).to.equal(
        stablecoinToWei((1000 + premium * 0.5).toString())
      );
      expect(await pool.lockedBalance()).to.equal(0);
      expect(await pool.availableCapacity()).to.equal(
        stablecoinToWei((1000 + premium * 0.5).toString())
      );

      // Check premium distribution
      expect(await usd.balanceOf(lottery.address)).to.equal(
        stablecoinToWei((premium * 0.4).toString())
      );
      expect(await usd.balanceOf(emergencyPool.address)).to.equal(
        stablecoinToWei((premium * 0.1).toString())
      );
    });

    it("should be able to settle a policy with some delay", async function () {
      const delayResult = 60;
      await oracleMock.setResult(delayResult);
      expect(await oracleMock.delayResult()).to.equal(delayResult);

      const requestId = solidityKeccak256(
        ["uint256", "string", "string", "uint256"],
        [toWei("0.1"), url, "delay", 1]
      );

      await setNextBlockTime(landingTime);

      await expect(
        flow.newClaimRequest(
          policyId,
          flightNumber,
          departureTime.toString(),
          "delay",
          false
        )
      )
        .to.emit(flow, "NewClaimRequest")
        .withArgs(policyId, flightNumber, requestId);

      const MAX_PAYOFF = formatStablecoin((await flow.MAX_PAYOFF()).toString());

      const payoff = Math.floor(delayResult ** 2 / 480);

      await expect(oracleMock.fulfill(requestId))
        .to.emit(flow, "FulfilledOracleRequest")
        .withArgs(policyId, requestId);

      const policyTokenInfo = await flow.policyList(policyId);

      expect(policyTokenInfo.alreadySettled).to.equal(true);
      expect(policyTokenInfo.delayResult).to.equal(delayResult);

      expect(await pool.activePremiums()).to.equal(0);
      expect(await pool.totalStakingBalance()).to.equal(
        stablecoinToWei((1000 - payoff + premium * 0.5).toString())
      );
      expect(await pool.lockedBalance()).to.equal(0);
      expect(await pool.availableCapacity()).to.equal(
        stablecoinToWei((1000 - payoff + premium * 0.5).toString())
      );
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
