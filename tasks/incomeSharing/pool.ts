import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import { readAddressList } from "../../scripts/contractAddress";

import { getTokenAddressOnAVAX } from "../../info/tokenAddress";

import {
  IncomeSharingVault,
  IncomeSharingVaultV2,
  IncomeSharingVaultV2__factory,
  IncomeSharingVault__factory,
  MockUSD__factory,
  VoteEscrowedDegis__factory,
} from "../../typechain";
import { formatUnits, parseUnits } from "ethers/lib/utils";

task("startIncomeSharingPool", "Start a new income sharing pool")
  .addParam("pid", "The pool id", null, types.string)
  .setAction(async (taskArgs, hre) => {
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    const vaultAddress = addressList[network.name].IncomeSharingVault;

    let usdAddress: string;
    if (network.name == "avax" || network.name == "avaxTest") {
      usdAddress = getTokenAddressOnAVAX("USDC.e");
    } else {
      usdAddress = addressList[network.name].MockUSD;
    }

    const vault: IncomeSharingVault = new IncomeSharingVault__factory(
      dev_account
    ).attach(vaultAddress);

    // Check the result
    const poolInfo = await vault.pools(taskArgs.pid);
    console.log("Income sharing pool info: ", poolInfo);

    if (poolInfo.available == false) {
      // Set
      const tx = await vault.startPool(usdAddress);
      console.log("Tx details: ", await tx.wait());
    } else console.log("pool id ", taskArgs.pid, " already started");
  });

task("setIncomeSpeed", "Set income sharing speed")
  .addParam("pid", "The pool id", null, types.string)
  .addParam("reward", "Reward speed", null, types.string)
  .setAction(async (taskArgs, hre) => {
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    const vaultAddress = addressList[network.name].IncomeSharingVault;

    const vault: IncomeSharingVault = new IncomeSharingVault__factory(
      dev_account
    ).attach(vaultAddress);

    const tx = await vault.setRewardSpeed(
      taskArgs.pid,
      parseUnits(taskArgs.reward, 6)
    );

    console.log("Tx details: ", await tx.wait());
  });

task("setRoundTime", "Set income sharing round time").setAction(
  async (taskArgs, hre) => {
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    const vaultAddress = addressList[network.name].IncomeSharingVault;

    const vault: IncomeSharingVault = new IncomeSharingVault__factory(
      dev_account
    ).attach(vaultAddress);

    const tx = await vault.setRoundTime(1209600);
    console.log("Tx details: ", await tx.wait());
  }
);

task("getIncomeBalance", "Get balance in income sharing vault").setAction(
  async (taskArgs, hre) => {
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    const vaultAddress = addressList[network.name].IncomeSharingVault;

    const vault: IncomeSharingVault = new IncomeSharingVault__factory(
      dev_account
    ).attach(vaultAddress);

    const usd = new MockUSD__factory(dev_account).attach(
      getTokenAddressOnAVAX("USDC.e")
    );

    const balance = await usd.balanceOf(vaultAddress);
    console.log("Balance: ", formatUnits(balance, 6));

    const emergencyBalance = await usd.balanceOf(
      addressList[network.name].EmergencyPool
    );
    console.log("emergency balance:", formatUnits(emergencyBalance, 6));

    const user = "0x7A670382953B45A2552040c4dE77fA83Ed6C0239";
    const pending = await vault.pendingReward(1, user);
    console.log("Pending: ", formatUnits(pending, 6));

    const userInfo = await vault.users(1, user);
    console.log(formatUnits(userInfo.totalAmount, 18));
    console.log(formatUnits(userInfo.rewardDebt, 18));

    const pool = await vault.pools(1);

    console.log(formatUnits(pool.rewardPerSecond, 6));
    console.log(pool.lastRewardTimestamp.toNumber());

    // const tx = await vault.setRewardSpeed(
    //   taskArgs.pid,
    //   parseUnits(taskArgs.reward, 6)
    // );
    // console.log("Tx details: ", await tx.wait());
  }
);

task("updateLastRewardBalance", "Update last reward balance").setAction(
  async (_, hre) => {
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    const vaultAddress = addressList[network.name].IncomeSharingVault;

    const vault: IncomeSharingVaultV2 = new IncomeSharingVaultV2__factory(
      dev_account
    ).attach(vaultAddress);

    const init = await vault.lastRewardBalance(1);
    console.log("Init: ", formatUnits(init, 6));

    const tx = await vault.updateLastRewardBalance(1);
    console.log("Tx details: ", await tx.wait());

    const final = await vault.lastRewardBalance(1);
    console.log("Final: ", formatUnits(final, 6));
  }
);
