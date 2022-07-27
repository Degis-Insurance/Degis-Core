import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import { readAddressList } from "../../scripts/contractAddress";
import {
  MockERC20,
  MockERC20__factory,
  Shield,
  Shield__factory,
} from "../../typechain";
import { stablecoinToWei, toWei } from "../../test/utils";
import { formatUnits } from "ethers/lib/utils";
import { getTokenAddressOnAVAX } from "../../info/tokenAddress";

task("shieldApprove", "Approve stablecoins for shield")
  .addParam(
    "stablecoin",
    "Stablecoin address to be approved",
    null,
    types.string
  )
  .setAction(async (taskArgs, hre) => {
    const addressList = readAddressList();

    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The dfault signer is: ", dev_account.address);

    const shieldAddress = addressList[network.name].Shield;
    const shield: Shield = new Shield__factory(dev_account).attach(
      shieldAddress
    );

    const ptpPoolAddress = await shield.PTP_MAIN();
    const crvPoolAddress = await shield.CURVE_YUSD();

    const stablecoinAddress = getTokenAddressOnAVAX(taskArgs.stablecoin);

    if (stablecoinAddress == "") {
      console.log("Invalid stablecoin address");
      return;
    }

    const tx = await shield.approveStablecoin(
      stablecoinAddress,
      crvPoolAddress
    );
    console.log("Tx details: ", await tx.wait());
  });

task("shieldDepositUSDC", "Deposit stablecoin to get shield").setAction(
  async (_, hre) => {
    const addressList = readAddressList();

    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The dfault signer is: ", dev_account.address);

    const shieldAddress = addressList[network.name].Shield;
    const shield: Shield = new Shield__factory(dev_account).attach(
      shieldAddress
    );

    const USDCAddress = await shield.USDC();
    const usdc: MockERC20 = new MockERC20__factory(dev_account).attach(
      USDCAddress
    );

    const tx_1 = await usdc.approve(shieldAddress, toWei("1000000"));
    console.log("Tx details: ", await tx_1.wait());

    const tx = await shield.deposit(
      0,
      USDCAddress,
      stablecoinToWei("0.001"),
      0
    );
    console.log("Tx details: ", await tx.wait());

    const shieldBalance = await shield.balanceOf(dev_account.address);
    console.log("Shield balance: ", formatUnits(shieldBalance, 6));

    const userBalanceRecord = await shield.userBalance(dev_account.address);
    console.log("User balance: ", formatUnits(userBalanceRecord, 6));
  }
);

task("shieldDeposit", "Deposit stablecoin to get shield")
  .addParam("stablecoin", "Stablecoin name", null, types.string)
  .addParam("amount", "Deposit amount", null, types.string)
  .setAction(async (taskArgs, hre) => {
    const addressList = readAddressList();

    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const shieldAddress = addressList[network.name].Shield;
    const shield: Shield = new Shield__factory(dev_account).attach(
      shieldAddress
    );

    const stablecoinAddress = getTokenAddressOnAVAX(taskArgs.stablecoin);
    if (stablecoinAddress == "") {
      console.log("Invalid stablecoin address");
      return;
    }

    const stablecoin: MockERC20 = new MockERC20__factory(dev_account).attach(
      stablecoinAddress
    );

    const allowance = await stablecoin.allowance(
      dev_account.address,
      shieldAddress
    );
    if (allowance < toWei("1000000")) {
      const tx_1 = await stablecoin.approve(
        shieldAddress,
        toWei("100000000000000")
      );
      console.log("Tx details: ", await tx_1.wait());
    }

    const type = taskArgs.stablecoin == "YUSD" ? 1 : 0;

    const amount =
      taskArgs.stablecoin == "YUSD"
        ? toWei(taskArgs.amount)
        : stablecoinToWei(taskArgs.amount);

    const tx = await shield.deposit(type, stablecoinAddress, amount, 0);
    console.log("Tx details: ", await tx.wait());

    const shieldBalance = await shield.balanceOf(dev_account.address);
    console.log("Shield balance: ", formatUnits(shieldBalance, 6));

    const userBalanceRecord = await shield.userBalance(dev_account.address);
    console.log("User balance: ", formatUnits(userBalanceRecord, 6));
  });

task("shieldWithdraw", "Withdraw shield and get stablecoins back")
  .addParam("stablecoin", "Output stablecoin name", null, types.string)
  .addParam("amount", "Withdraw amount", null, types.string)
  .setAction(async (taskArgs, hre) => {
    const addressList = readAddressList();

    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The dfault signer is: ", dev_account.address);

    const shieldAddress = addressList[network.name].Shield;
    const shield: Shield = new Shield__factory(dev_account).attach(
      shieldAddress
    );

    const stablecoinAddress = getTokenAddressOnAVAX(taskArgs.stablecoin);
    if (stablecoinAddress == "") {
      console.log("Invalid stablecoin address");
      return;
    }

    const tx = await shield["withdraw(uint256,address,uint256,uint256)"](
      0,
      stablecoinAddress,
      stablecoinToWei(taskArgs.amount),
      0
    );
    console.log("Tx details: ", await tx.wait());

    const shieldBalance = await shield.balanceOf(dev_account.address);
    console.log("Shield balance: ", formatUnits(shieldBalance, 6));

    const userBalanceRecord = await shield.userBalance(dev_account.address);
    console.log("User balance: ", formatUnits(userBalanceRecord, 6));
  });
