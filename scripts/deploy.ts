import { ethers } from "hardhat";
import { loadInstance } from "./loadInstance";

async function main() {
  // Get the contract instances
  const { Greeter, MockUSD, DegisToken, BuyerToken, PurchaseIncentiveVault } =
    await loadInstance();

  // We get the contract to deploy
  const usd = await MockUSD.deploy();
  const greeter = await Greeter.deploy("Hello, Hardhat!");
  const degis = await DegisToken.deploy();
  const buyerToken = await BuyerToken.deploy();

  await usd.deployed();
  await greeter.deployed();
  await degis.deployed();
  await buyerToken.deployed();

  console.log("MockUSD deployed to:", usd.address);
  console.log("Greeter deployed to:", greeter.address);
  console.log("DegisToken deployed to:", degis.address);
  console.log("BuyerToken deployed to:", buyerToken.address);

  const vault = await PurchaseIncentiveVault.deploy(
    buyerToken.address,
    degis.address
  );
  await vault.deployed();
  console.log("PurchaseIncentiveVault deployed to:", vault.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// deploy: The address is available but the contract maybe haven't been deployed
// deployed: The contract is deployed on the chain
