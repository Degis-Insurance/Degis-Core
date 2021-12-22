import hre from "hardhat";
import {
  loadInstance,
  loadInstance_Tokens,
  _loadInstance,
  _loadMultipleInstance,
} from "../loadInstance";
import { readAddressList, storeAddressList } from "../contractAddress";
import { ContractFactory } from "ethers";

const networkName = hre.network.name;

async function main() {
  const addressList = readAddressList();
  console.log("Previous address list:", addressList);

  console.log("Deploying to nerwork:", networkName);

  // Get the contract instances
  const { MockUSD, BuyerToken, DegisToken } = await loadInstance_Tokens();

  const [PurchaseIncentiveVault] = await _loadMultipleInstance([
    "PurchaseIncentiveVault",
  ]);

  // We get the contract to deploy
  const usd = await MockUSD.deploy();

  const degis = await DegisToken.deploy();
  const buyerToken = await BuyerToken.deploy();

  await usd.deployed();
  await degis.deployed();
  await buyerToken.deployed();

  console.log("MockUSD deployed to:", usd.address);
  console.log("DegisToken deployed to:", degis.address);
  console.log("BuyerToken deployed to:", buyerToken.address);

  // addressList[networkName].DegisToken = degis.address;
  // addressList[networkName].BuyerToken = buyerToken.address;
  // addressList[networkName].MockUSD = usd.address;

  const vault = await PurchaseIncentiveVault.deploy(
    buyerToken.address,
    degis.address
  );
  await vault.deployed();
  console.log("PurchaseIncentiveVault deployed to:", vault.address);
  // addressList[networkName].PurchaseIncentiveVault = vault.address;

  storeAddressList(addressList);
}

export async function _deployInstance(contractInstance: ContractFactory) {
  await contractInstance.deploy();
}

main()
  .then(() => {
    process.exitCode = 0;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

// deploy: The address is available but the contract maybe haven't been deployed
// deployed: The contract is deployed on the chain
