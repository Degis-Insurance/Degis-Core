import { parseUnits } from "ethers/lib/utils";
import hre from "hardhat";
import { readAddressList } from "../contractAddress";

async function main() {
  const addressList = readAddressList();

  const { getNamedAccounts, network } = hre;

  const farmingPoolAddress = addressList[network.name].FarmingPool;
  console.log("You are adding new pools at the ", network.name, " network");
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

  const FarmingPool = await hre.ethers.getContractFactory("FarmingPool");
  const farmingPool = FarmingPool.attach(farmingPoolAddress);

  const tx = await farmingPool.add(testAddress, parseUnits("10"), false, {
    from: testAddress,
  });
  console.log(await tx.wait());
}

main()
  .then(() => {
    process.exitCode = 0;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
