import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import { readAddressList } from "../../scripts/contractAddress";

import { getTokenAddressOnAVAX } from "../../info/tokenAddress";

import {
  IncomeSharingVault,
  IncomeSharingVault__factory,
  MockUSD__factory,
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

    const usd = new MockUSD__factory(dev_account).attach(
      getTokenAddressOnAVAX("USDC.e")
    );

    const bal = await usd.balanceOf(vaultAddress);
    console.log("USDC balance: ", formatUnits(bal, 6));

    // const tx = await vault.setRewardSpeed(
    //   taskArgs.pid,
    //   parseUnits(taskArgs.reward, 6)
    // );
    // console.log("Tx details: ", await tx.wait());
  });
