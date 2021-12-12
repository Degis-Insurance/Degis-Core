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

  return { Greeter, MockUSD, DegisToken, BuyerToken, PurchaseIncentiveVault };
}
