import { subtask, task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
// import hre from "hardhat";

import {
  FarmingPool,
  FarmingPool__factory,
  ProxyAdmin,
  ProxyAdmin__factory,
  VoteEscrowedDegis,
  VoteEscrowedDegis__factory,
} from "../../typechain";
import {
  readAddressList,
  readFarmingPoolList,
  storeFarmingPoolList,
} from "../../scripts/contractAddress";
import { parseUnits, formatEther } from "ethers/lib/utils";

const addressList = readAddressList();
const farmingPoolList = readFarmingPoolList();

task("setGenerationRate", "Set the generation rate of veDEG")
  .addParam("rate", "The generation rate", null, types.string)
  .setAction(async (taskArgs, hre) => {
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The dfault signer is: ", dev_account.address);

    const veAddress = addressList[network.name].VoteEscrowedDegis;

    const VeDEG: VoteEscrowedDegis__factory =
      await hre.ethers.getContractFactory("VoteEscrowedDegis");
    const veDEG: VoteEscrowedDegis = VeDEG.attach(veAddress);

    const tx = await veDEG.setGenerationRate(parseUnits(taskArgs.rate));
    console.log("tx details: ", await tx.wait());

    const newRate = await veDEG.generationRate();
    console.log("new rate: ", newRate.toString());
  });

task("upgradeVeDEG", "Upgrade veDEG implementation").setAction(
  async (_, hre) => {
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const veProxyAddress = addressList[network.name].VoteEscrowedDegis;
    const ProxyAdminAddress = addressList[network.name].ProxyAdmin;

    const admin: ProxyAdmin = new ProxyAdmin__factory(dev_account).attach(
      ProxyAdminAddress
    );

    const impl = "0x1A9d753531Fb240697003C78423132893dDF1902";

    const tx = await admin.upgrade(veProxyAddress, impl);
    console.log("tx details: ", await tx.wait());
  }
);

task("addWhiteList-Ve", "Add whitelist for veDEG").setAction(async (_, hre) => {
  const { network } = hre;

  // Signers
  const [dev_account] = await hre.ethers.getSigners();
  console.log("The default signer is: ", dev_account.address);

  const veDEGAddress = addressList[network.name].VoteEscrowedDegis;

  const veDEG: VoteEscrowedDegis = new VoteEscrowedDegis__factory(
    dev_account
  ).attach(veDEGAddress);

  const IncomeSharingAddress = addressList[network.name].IncomeSharingVault;

  const tx = await veDEG.addWhitelist(IncomeSharingAddress);
  console.log("tx details: ", await tx.wait());
});
