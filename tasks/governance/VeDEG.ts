import { task } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import {
  VoteEscrowedDegis,
  VoteEscrowedDegis__factory,
} from "../../typechain";
import {  formatEther } from "ethers/lib/utils";

task("checkVeState", "Check veDEG state").setAction(async (_, hre) => {
  const { network, addressList, dev_account } = await hre.run("preparation");

  const user = "0x00c7f020A6a379cfab9377BC79f5bB4100d013F8";

  const veDEGAddress = addressList[network.name].VoteEscrowedDegis;

  const veDEG: VoteEscrowedDegis = new VoteEscrowedDegis__factory(
    dev_account
  ).attach(veDEGAddress);

  const balance = await veDEG.balanceOf(user);
  console.log("User veDEG balance: ", formatEther(balance));

  const userInfo = await veDEG.users(user);
  console.log("User veDEG balance: ", formatEther(userInfo.amount));
  console.log("User last release:", userInfo.lastRelease.toString());
  console.log("User veDEG locked: ", formatEther(userInfo.amountLocked));
  console.log("User lock until:", userInfo.lockUntil.toString());

  const locked = await veDEG.locked(user);
  console.log("User veDEG locked: ", formatEther(locked));

  const claimable = await veDEG.claimable(user);
  console.log("User veDEG claimable: ", formatEther(claimable));
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

