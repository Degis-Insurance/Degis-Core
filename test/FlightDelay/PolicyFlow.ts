import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
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
    [dev_account, user1] = await ethers.getSigners();

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

  describe("Deployment", function(){
      
  })
});
