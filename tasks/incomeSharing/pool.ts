import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import { readAddressList } from "../../scripts/contractAddress";

import { getTokenAddressOnAVAX } from "../../info/tokenAddress";

import {
  IncomeSharingVaultV2,
  IncomeSharingVaultV2__factory,
  MockUSD__factory,
  VoteEscrowedDegis__factory,
} from "../../typechain";
import { formatUnits, parseUnits } from "ethers/lib/utils";

/**
 * @notice Start a new income sharing pool
 *
 * @param token Reward token address
 */
task("startIncomeSharingPool", "Start a new income sharing pool")
  .addParam("token", "The pool reward token", null, types.string)
  .setAction(async (taskArgs, hre) => {
    const { network, addressList, dev_account } = await hre.run("preparation");

    const vaultAddress = addressList[network.name].IncomeSharingVault;

    const vault: IncomeSharingVaultV2 = new IncomeSharingVaultV2__factory(
      dev_account
    ).attach(vaultAddress);

    // Tx
    const tx = await vault.startPool(taskArgs.token);
    console.log("Tx details: ", await tx.wait());

    // Check the pool result
    const poolId = await vault.nextPool();
    const poolInfo = await vault.pools(poolId.sub(1));
    console.log("Income sharing pool info: ", poolInfo);
  });

task("getIncomeBalance", "Get balance in income sharing vault").setAction(
  async (taskArgs, hre) => {
    const { network, addressList, dev_account } = await hre.run("preparation");

    const vaultAddress = addressList[network.name].IncomeSharingVault;

    const vault: IncomeSharingVaultV2 = new IncomeSharingVaultV2__factory(
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

    // const tx = await vault.setRewardSpeed(
    //   taskArgs.pid,
    //   parseUnits(taskArgs.reward, 6)
    // );
    // console.log("Tx details: ", await tx.wait());
  }
);

// task("updateLastRewardBalance", "Update last reward balance").setAction(
//   async (_, hre) => {
//     const { network, addressList, dev_account } = await hre.run("preparation");

//     const vaultAddress = addressList[network.name].IncomeSharingVault;

//     const vault: IncomeSharingVaultV2 = new IncomeSharingVaultV2__factory(
//       dev_account
//     ).attach(vaultAddress);

//     const init = await vault.lastRewardBalance(1);
//     console.log("Init: ", formatUnits(init, 6));

//     const tx = await vault.updateLastRewardBalance(1);
//     console.log("Tx details: ", await tx.wait());

//     const final = await vault.lastRewardBalance(1);
//     console.log("Final: ", formatUnits(final, 6));
//   }
// );
