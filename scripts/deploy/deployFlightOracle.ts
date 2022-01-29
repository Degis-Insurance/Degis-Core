import hre from "hardhat";
import { _loadInstance } from "../loadInstance";
import { readAddressList, storeAddressList } from "../contractAddress";
import { FlightOracle, FlightOracle__factory } from "../../typechain";

async function main() {
  const { network } = hre;

  const addressList = readAddressList();
  console.log("Previous address list:", addressList);

  const policyFlowAddress = addressList[network.name].PolicyFlow;
  const linkAddress = "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846";

  const FlightOracle: FlightOracle__factory =
    await hre.ethers.getContractFactory("FlightOracle");

  const oracle: FlightOracle = await FlightOracle.deploy(
    policyFlowAddress,
    linkAddress
  );

  console.log("Deploying oracle:", oracle.address);

  addressList[network.name].FlightOracle = oracle.address;

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
