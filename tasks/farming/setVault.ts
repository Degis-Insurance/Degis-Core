import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
// import hre from "hardhat";

import {
  PurchaseIncentiveVault,
  PurchaseIncentiveVault__factory,
} from "../../typechain";
import { readAddressList } from "../../scripts/contractAddress";
import { parseUnits } from "ethers/lib/utils";

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
