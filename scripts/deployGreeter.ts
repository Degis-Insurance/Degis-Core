import hre from "hardhat";
import { _loadInstance } from "./loadInstance";

const networkName = hre.network.name;
const chainId = hre.network.config.chainId;

async function main() {
  console.log("Current network:", networkName);
  console.log("Current chain id:", chainId);
  // Get the contract instances
  const Greeter = await _loadInstance("Greeter");

  // We get the contract to deploy
  const greeter = await Greeter.deploy("Hello, Hardhat!");

  await greeter.
  deployed();

  console.log("Greeter deployed to:", greeter.address);
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
