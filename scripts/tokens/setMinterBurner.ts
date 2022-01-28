import hre from "hardhat";
import { DegisToken, DegisToken__factory } from "../../typechain";
import { readAddressList } from "../contractAddress";

async function main() {
  const addressList = readAddressList();

  const { getNamedAccounts, network } = hre;
  console.log(
    "You are setting minters&burners at the ",
    network.name,
    " network"
  );

  const degisTokenAddress = addressList[network.name].DegisToken;
  console.log(
    "The degis token address of this network is: ",
    degisTokenAddress
  );

  // Signers
  const [dev_account] = await hre.ethers.getSigners();
  console.log("The dfault signer is: ", dev_account.address);

  const DegisToken: DegisToken__factory = await hre.ethers.getContractFactory(
    "DegisToken"
  );
  const degisToken: DegisToken = DegisToken.attach(degisTokenAddress);

  const tx_1 = await degisToken.addMinter(
    addressList[network.name].FarmingPool
  );
  console.log("tx details:",await tx_1.wait());

  const tx_2 = await degisToken.addMinter(
    addressList[network.name].PurchaseIncentiveVault
  );

  const tx_3 = await degisToken.addMinter(
    addressList[network.name].StakingPoolFactory
  );
}

main()
  .then(() => {
    process.exitCode = 0;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
