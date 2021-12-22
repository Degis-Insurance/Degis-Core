import { ContractFactory } from "ethers";
import { ethers } from "hardhat";

export async function loadInstance() {
  const FlightDelayInstance = await loadInstance_FlightDelay();
  const NaughtyPriceInstance = await loadInstance_NaughtyPrice();
  const TokensInstance = await loadInstance_Tokens();
  const FarmingInstance = await loadInstance_Farming();
  const LotteryInstance = await loadInstance_Lottery();

  return {
    FlightDelayInstance,
    NaughtyPriceInstance,
    TokensInstance,
    FarmingInstance,
    LotteryInstance,
  };
}

export async function loadInstance_FlightDelay() {
  const InsurancePool = await _loadInstance("InsurancePool");
  const PolicyFlow = await _loadInstance("PolicyFlow");
  const FlightOracle = await _loadInstance("FlightOracle");
  const SigManager = await _loadInstance("SigManager");
  const FDPolicyToken = await _loadInstance("FDPolicyToken");

  return {
    InsurancePool,
    PolicyFlow,
    FlightOracle,
    SigManager,
    FDPolicyToken,
  };
}

export async function loadInstance_NaughtyPrice() {
  const PolicyCore = await _loadInstance("PolicyCore");
  const NaughtyFactory = await _loadInstance("NaughtyFactory");
  const NaughtyRouter = await _loadInstance("NaughtyRouter");
  const PriceGetter = await _loadInstance("PriceGetter");

  return {
    PolicyCore,
    NaughtyFactory,
    NaughtyRouter,
    PriceGetter,
  };
}

export async function loadInstance_Lottery() {
  const RandomNumberGenerator = await _loadInstance("RandomNumberGenerator");
  const DegisLottery = await _loadInstance("DegisLottery");

  return {
    RandomNumberGenerator,
    DegisLottery,
  };
}

export async function loadInstance_Tokens() {
  const MockUSD = await _loadInstance("MockUSD");
  // Tokens
  const DegisToken = await _loadInstance("DegisToken");
  const BuyerToken = await _loadInstance("BuyerToken");

  return {
    MockUSD,
    DegisToken,
    BuyerToken,
  };
}

export async function loadInstance_Farming() {
  const PurchaseIncentiveVault = await _loadInstance("PurchaseIncentiveVault");
  const FarmingPool = await _loadInstance("FarmingPool");

  return { PurchaseIncentiveVault, FarmingPool };
}

export async function _loadInstance(contractName: string) {
  const instance = await ethers.getContractFactory(contractName);
  return instance;
}

export async function _loadMultipleInstance(contractNameList: string[]) {
  let instanceList: ContractFactory[] = [];
  for (let i in contractNameList) {
    instanceList[i] = await _loadInstance(contractNameList[i]);
  }
  return instanceList;
}
