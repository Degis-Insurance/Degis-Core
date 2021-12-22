import hre from "hardhat";
import { _loadInstance } from "../loadInstance";
import { readAddressList, storeAddressList } from "../contractAddress";

const networkName = hre.network.name;

async function main() {
  const addressList = readAddressList();
  console.log("Previous address list:", addressList);

  console.log("Deploying to nerwork:", networkName);

  storeAddressList(addressList);
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