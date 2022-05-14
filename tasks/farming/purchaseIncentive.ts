import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
// import hre from "hardhat";

import {
  PurchaseIncentiveVault,
  PurchaseIncentiveVault__factory,
} from "../../typechain";
import { readAddressList } from "../../scripts/contractAddress";

import { formatEther, parseUnits } from "ethers/lib/utils";
import { toWei } from "../../test/utils";

task(
  "settlePurchaseIncentive",
  "Settle the current round of purchase incentive"
).setAction(async (_, hre) => {
  const { network } = hre;

  // Signers
  const [dev_account] = await hre.ethers.getSigners();
  console.log("The default signer is: ", dev_account.address);

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
  console.log("Round after settlement: ", roundAfter.toNumber());
});

task(
  "setVaultReward",
  "Set the reward speed and interval in purchase incentive vault"
)
  .addParam("reward", "Degis reward per round", null, types.string)
  .addParam("interval", "Interval of rounds", null, types.int)
  .setAction(async (taskArgs, hre) => {
    const degisPerRound = taskArgs.reward;
    const rewardInterval = taskArgs.interval;
    console.log("Degis per round: ", degisPerRound);
    console.log("Reward interval: ", rewardInterval);

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

    // Set
    const tx_1 = await vault.setDegisPerRound(
      parseUnits(degisPerRound.toString())
    );
    console.log("Tx details:", await tx_1.wait());

    const tx_2 = await vault.setDistributionInterval(rewardInterval);
    console.log("Tx details:", await tx_2.wait());

    // Check the result
    const degisR = await vault.degisPerRound();
    console.log("Degis reward in vault: ", degisR);

    const disInterval = await vault.distributionInterval();
    console.log("Distribution interval in vault: ", disInterval);
  });

task(
  "setPieceWise-Purchase",
  "Set the threshold and piecewise reward"
).setAction(async (taskArgs, hre) => {
  const threshold = [
    0,
    toWei("4000"),
    toWei("8500"),
    toWei("13500"),
    toWei("20000"),
    toWei("30000"),
    toWei("48000"),
    toWei("70000"),
  ];
  const pieceWise = [
    toWei("1000"),
    toWei("2000"),
    toWei("3000"),
    toWei("4000"),
    toWei("5000"),
    toWei("6000"),
    toWei("7000"),
    toWei("8000")
  ];

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

  // Set
  const tx = await vault.setPiecewise(threshold, pieceWise);
  console.log("Tx details:", await tx.wait());

  // Check the result
  const degisR = await vault.getRewardPerRound();
  console.log("Degis reward in vault: ", degisR);

  const disInterval = await vault.distributionInterval();
  console.log("Distribution interval in vault: ", disInterval);
});
