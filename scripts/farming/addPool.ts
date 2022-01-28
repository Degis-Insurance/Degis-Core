import { parseUnits } from "ethers/lib/utils";
import hre from "hardhat";
import { FarmingPool, FarmingPool__factory } from "../../typechain";
import { readAddressList } from "../contractAddress";

async function main() {
  const addressList = readAddressList();

  const { getNamedAccounts, network } = hre;
  console.log("You are adding new pools at the ", network.name, " network");

  const farmingPoolAddress = addressList[network.name].FarmingPool;

  console.log(
    "The farming pool address of this network is: ",
    farmingPoolAddress
  );

  // Named accounts
  const { deployer, testAddress } = await getNamedAccounts();
  console.log("The dev account is: ", deployer);

  // Signers
  const [dev_account] = await hre.ethers.getSigners();
  console.log("The dfault signer is: ", dev_account.address);

  // Get the contract factory and instance
  const FarmingPool: FarmingPool__factory = await hre.ethers.getContractFactory(
    "FarmingPool"
  );
  const farmingPool: FarmingPool = FarmingPool.attach(farmingPoolAddress);

  //Address to add
  const lptokenAddress = addressList[network.name].InsurancePool;

  const tx = await farmingPool.add(lptokenAddress, parseUnits("10"), false);
  console.log("tx details:",await tx.wait());
}

main()
  .then(() => {
    process.exitCode = 0;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
