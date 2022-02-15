import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
// import hre from "hardhat";

import {
  PurchaseIncentiveVault,
  PurchaseIncentiveVault__factory,
} from "../../typechain";
import { readAddressList } from "../../scripts/contractAddress";

import { formatEther, parseUnits } from "ethers/lib/utils";

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
  // const vaultAddress = "0xC169Fb5cA79697819946ccfF2C19f8cAC72c7d4e";

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
  console.log("Round before settlement:", roundBefore.toNumber());

  const degisR = await vault.degisPerRound();
  console.log("Degis reward in vault: ", formatEther(degisR));

  const disInterval = await vault.distributionInterval();
  console.log("Distribution interval in vault: ", disInterval.toString());

  const tx = await vault.settleCurrentRound();
  console.log("tx details:", await tx.wait());

  // Get the round after settlement
  const roundAfter = await vault.currentRound();
  console.log("Round after settlement: ", roundAfter);
});

task(
  "setVaultReward",
  "Set the reward speed and interval in purchase incentive vault"
)
  .addParam("reward", "Degis reward per round", null, types.int)
  .addParam("interval", "Interval of rounds", null, types.int)
  .setAction(async (taskArgs, hre) => {
    const degisPerRound = taskArgs.reward;
    const rewardInterval = taskArgs.interval;
    console.log("Degis per round: ", degisPerRound);
    console.log("Reward interval: ", rewardInterval);

    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();
    const vaultAddress = addressList[network.name].PurchaseIncentiveVault;
    // const vaultAddress = "0xC169Fb5cA79697819946ccfF2C19f8cAC72c7d4e";

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
    console.log("Tx1 details:", await tx_1.wait());

    const tx_2 = await vault.setDistributionInterval(rewardInterval);
    console.log("Tx2 details:", await tx_2.wait());

    // Check the result
    const degisR = await vault.degisPerRound();
    console.log("Degis reward in vault: ", degisR);

    const disInterval = await vault.distributionInterval();
    console.log("Distribution interval in vault: ", disInterval);
  });

task("getUser", "Get the user's balance").setAction(async (_, hre) => {
  const { network } = hre;

  // Signers
  const [dev_account] = await hre.ethers.getSigners();
  console.log("The default signer is: ", dev_account.address);
  const addressList = readAddressList();
  const vaultAddress = addressList[network.name].PurchaseIncentiveVault;
  // const vaultAddress = "0xC169Fb5cA79697819946ccfF2C19f8cAC72c7d4e";

  console.log(
    "The purchase incentive vault address of this network is: ",
    vaultAddress
  );

  const PurchaseIncentiveVault: PurchaseIncentiveVault__factory =
    await hre.ethers.getContractFactory("PurchaseIncentiveVault");
  const vault: PurchaseIncentiveVault =
    PurchaseIncentiveVault.attach(vaultAddress);

  const userShares = await vault.userSharesInRound(
    "0xf0535790505d39E526650031B404973530917ea2",
    3
  );
  console.log("User shares in", 3, ": ", formatEther(userShares));

  const userRewards = await vault.userRewards(
    "0xf0535790505d39E526650031B404973530917ea2"
  );
  console.log("User rewards: ", formatEther(userRewards));

  const lastroundindex = await vault.userInfo(
    "0xf0535790505d39E526650031B404973530917ea2"
  );
  console.log("Last round index: ", lastroundindex.toNumber());

  const roundShares = await vault.roundInfo(3);
  console.log("Round shares: ", formatEther(roundShares.degisPerShare));

  const currentRound = await vault.currentRound();
  console.log("Current round: ", currentRound.toNumber());
});
