import hre from "hardhat";
import { parseUnits } from "ethers/lib/utils";
import { FarmingPool, FarmingPool__factory } from "../../typechain";
import { readAddressList } from "../contractAddress";

// const args = require("minimist")(process.argv.slice(2));

// const poolId: number = args["id"];
// const degisPerBlock: string = args["reward"];

async function main() {
  const addressList = readAddressList();

  const { getNamedAccounts, network } = hre;
  console.log("You are setting degis reward at the ", network.name, " network");

  const farmingPoolAddress = addressList[network.name].FarmingPool;

  console.log(
    "The farming pool address of this network is: ",
    farmingPoolAddress
  );

  // Signers
  const [dev_account] = await hre.ethers.getSigners();
  console.log("The dfault signer is: ", dev_account.address);

  // Get the contract factory and instance
  const FarmingPool: FarmingPool__factory = await hre.ethers.getContractFactory(
    "FarmingPool"
  );
  const farmingPool: FarmingPool = FarmingPool.attach(farmingPoolAddress);

  //Parameters
  const poolId = 1;
  const degisPerBlock = parseUnits("5");

  const tx = await farmingPool.setDegisReward(poolId, degisPerBlock, false);
  console.log("tx details:", await tx.wait());
}

main()
  .then(() => {
    process.exitCode = 0;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
