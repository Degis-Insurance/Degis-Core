import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
// import hre from "hardhat";

import {
  PurchaseIncentiveVault,
  PurchaseIncentiveVault__factory,
} from "../../typechain";
import { readAddressList } from "../../scripts/contractAddress";

task(
  "settlePurchaseIncentive",
  "Settle the current round of purchase incentive"
).setAction(async (_, hre) => {
  const { network } = hre;

  // Signers
  const [dev_account] = await hre.ethers.getSigners();
  console.log("The dfault signer is: ", dev_account.address);

  const addressList = readAddressList();
  const vaultAddress = addressList[network.name].PurchaseIncentiveVault;

  console.log(
    "The purchase incentive vault address of this network is: ",
    vaultAddress
  );

  const PurchaseIncentiveVault: PurchaseIncentiveVault__factory =
    await hre.ethers.getContractFactory("PurchaseIncentiveVault");
  const vault: PurchaseIncentiveVault =
    PurchaseIncentiveVault.attach(vaultAddress);

  // Get the round before settlement
  const roundBefore = await vault.currentRound();
  console.log("Round before settlement:", roundBefore);

  const tx = await vault.settleCurrentRound();
  console.log("tx details:", await tx.wait());

  // Get the round after settlement
  const roundAfter = await vault.currentRound();
  console.log("Round after settlement: ", roundAfter);
});
