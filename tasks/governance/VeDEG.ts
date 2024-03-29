import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import {
  IncomeSharingVault,
  IncomeSharingVault__factory,
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

task("setGenerationRate", "Set the generation rate of veDEG")
  .addParam("rate", "The generation rate", null, types.string)
  .setAction(async (taskArgs, hre) => {
    const { network, addressList, dev_account } = await hre.run("preparation");

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
    const { network, addressList, dev_account } = await hre.run("preparation");

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

task("addWhiteList-Ve", "Add whitelist for veDEG")
  .addParam("address", "The address to add", null, types.string)
  .setAction(async (taskArgs, hre) => {
    const { network, addressList, dev_account } = await hre.run("preparation");

    const veDEGAddress = addressList[network.name].VoteEscrowedDegis;

    const veDEG: VoteEscrowedDegis = new VoteEscrowedDegis__factory(
      dev_account
    ).attach(veDEGAddress);

    const tx = await veDEG.addWhitelist(taskArgs.address);
    console.log("tx details: ", await tx.wait());
  });

task("removeWhiteList-Ve", "Remove whitelist for veDEG")
  .addParam("address", "The address to remove", null, types.string)
  .setAction(async (taskArgs, hre) => {
    const { network, addressList, dev_account } = await hre.run("preparation");

    const veDEGAddress = addressList[network.name].VoteEscrowedDegis;

    const veDEG: VoteEscrowedDegis = new VoteEscrowedDegis__factory(
      dev_account
    ).attach(veDEGAddress);

    const tx = await veDEG.removeWhitelist(taskArgs.address);
    console.log("tx details: ", await tx.wait());
  });

task("checkVeState", "Check veDEG state").setAction(async (_, hre) => {
  const { network, addressList, dev_account } = await hre.run("preparation");

  const user = "0x37d92a1bab189b2f58975c4ee6210343f3e926a0";

  const veDEGAddress = addressList[network.name].VoteEscrowedDegis;

  const veDEG: VoteEscrowedDegis = new VoteEscrowedDegis__factory(
    dev_account
  ).attach(veDEGAddress);

  const incomeSharing: IncomeSharingVault = new IncomeSharingVault__factory(
    dev_account
  ).attach(addressList[network.name].IncomeSharingVault);

  const userAmount = await incomeSharing.users(1, user);
  console.log(
    "user Amount:",
    formatEther(userAmount.totalAmount),
    formatEther(userAmount.rewardDebt)
  );

  const balance = await veDEG.balanceOf(user);
  console.log("balance: ", formatEther(balance));

  const locked = await veDEG.locked(user);
  console.log("locked: ", formatEther(locked));
});

task("setNFTStaking", "Set nft staking address in veDEG").setAction(
  async (_, hre) => {
    const { network, addressList, dev_account } = await hre.run("preparation");

    const veDEGAddress = addressList[network.name].VoteEscrowedDegis;

    const veDEG: VoteEscrowedDegis = new VoteEscrowedDegis__factory(
      dev_account
    ).attach(veDEGAddress);

    const currentAddress = await veDEG.nftStaking();
    console.log("current nft staking address ", currentAddress);

    const nftStakingAddress = "0x6ddabd0e0D5574Bc487Fea9Bb8CFAccf26CEbebA";
    const tx = await veDEG.setNFTStaking(nftStakingAddress);
    console.log("tx details: ", await tx.wait());
  }
);

task("unlockVeDEG", "Unlock veDEG").setAction(async (_, hre) => {
  const { network, addressList, dev_account } = await hre.run("preparation");

  const veDEGAddress = addressList[network.name].VoteEscrowedDegis;

  const veDEG: VoteEscrowedDegis = new VoteEscrowedDegis__factory(
    dev_account
  ).attach(veDEGAddress);

  const user = "0xf84eb208b432bacbc417f109e929f432b64ffd7e";
  const locked = await veDEG.locked(user);
  console.log("Locked before", formatEther(locked));

  const tx = await veDEG.unlockVeDEG(user, locked);
  console.log("tx details: ", await tx.wait());

  const lockedAfter = await veDEG.locked(user);
  console.log("Locked after", formatEther(lockedAfter));
});

task("filterLockEvent", "Filter locked event").setAction(async (_, hre) => {
  const { network, addressList, dev_account } = await hre.run("preparation");

  const veDEGAddress = addressList[network.name].VoteEscrowedDegis;

  const veDEG: VoteEscrowedDegis = new VoteEscrowedDegis__factory(
    dev_account
  ).attach(veDEGAddress);

  const user = "0xf84eb208b432bacbc417f109e929f432b64ffd7e";

  const locked = await veDEG.locked(user);
  console.log("Locked before", formatEther(locked));

  const filter = veDEG.filters.LockVeDEG(null, user);

  const events = await veDEG.queryFilter(filter, 16041710, 16043710);
  console.log(events);
});

task("unlockVeDEG", "Unlock veDEG").setAction(async (_, hre) => {
  const { network, addressList, dev_account } = await hre.run("preparation");

  const veDEGAddress = addressList[network.name].VoteEscrowedDegis;

  const veDEG: VoteEscrowedDegis = new VoteEscrowedDegis__factory(
    dev_account
  ).attach(veDEGAddress);

  const user = "0x81c2B3E6872aB8F9550864d357e236FA828B4CD8";

  const locked = await veDEG.locked(user);
  console.log("Locked before", formatEther(locked));

  const tx = await veDEG.unlockVeDEG(user, locked);
  console.log("tx details: ", await tx.wait());
});
