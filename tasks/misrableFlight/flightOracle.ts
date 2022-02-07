import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import { readAddressList } from "../../scripts/contractAddress";
import { FlightOracle, FlightOracle__factory } from "../../typechain";
import { toUtf8Bytes } from "ethers/lib/utils";

// import hre from "hardhat";

task("setOracleAddress", "Set the oracle address")
  .addParam("address", "address of the oracle", null, types.string)
  .setAction(async (taskArgs, hre) => {
    // Get the args
    const oracleAddress = taskArgs.address;

    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    // Load contract instance
    const flightOracleAddress = addressList[network.name].FlightOracle;
    const FlightOracle: FlightOracle__factory =
      await hre.ethers.getContractFactory("FlightOracle");
    const oracle: FlightOracle = FlightOracle.attach(flightOracleAddress);

    const tx = await oracle.setOracleAddress(oracleAddress);
    console.log("Tx details: ", await tx.wait());

    const oAddress = await oracle.oracleAddress();
    console.log("oracle address now: ", oAddress);
  });

task("setJobId", "Set the oracle job id")
  .addParam("id", "job id of the oracle", null, types.string)
  .setAction(async (taskArgs, hre) => {
    // Get the args
    const jobid = taskArgs.id;

    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    // Load contract instance
    const flightOracleAddress = addressList[network.name].FlightOracle;
    const FlightOracle: FlightOracle__factory =
      await hre.ethers.getContractFactory("FlightOracle");
    const oracle: FlightOracle = FlightOracle.attach(flightOracleAddress);

    const tx = await oracle.setJobId(toUtf8Bytes(jobid));
    console.log("Tx details: ", await tx.wait());

    const info = await oracle.jobId();
    console.log("oracle job id now: ", info);
  });
