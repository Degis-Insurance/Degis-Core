import { ethers } from "hardhat";
import { Greeter__factory } from "../typechain";

export async function loadInstance() {
  const Greeter: Greeter__factory = await ethers.getContractFactory("Greeter");

  // MockUSD
  const MockUSD = await ethers.getContractFactory("MockUSD");

  // Tokens
  const DegisToken = await ethers.getContractFactory("DegisToken");
  const BuyerToken = await ethers.getContractFactory("BuyerToken");

  // PurchaseIncentiveVault
  const PurchaseIncentiveVault = await ethers.getContractFactory(
    "PurchaseInventiveVault"
  );

  // Flight-delay
  const PolicyFlow = await ethers.getContractFactory("PolicyFlow");
  const SigManager = await ethers.getContractFactory("SigManager");

  return {
    Greeter,
    MockUSD,
    DegisToken,
    BuyerToken,
    PurchaseIncentiveVault,
    PolicyFlow,
    SigManager,
  };
}
