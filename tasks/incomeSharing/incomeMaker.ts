import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import { readAddressList } from "../../scripts/contractAddress";

import { getTokenAddressOnAVAX } from "../../info/tokenAddress";

import { IncomeMaker__factory, NaughtyPair__factory } from "../../typechain";
import { formatUnits } from "ethers/lib/utils";

task("getIncomeMakerBalance", "Get income maker lp balance")
  .addParam("pair", "The pool address", null, types.string)
  .setAction(async (taskArgs, hre) => {
    console.log("\nGetting income maker balance...\n");

    const pairAddress = taskArgs.pair;

    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    // Income maker contract
    const maker = new IncomeMaker__factory(dev_account).attach(
      addressList[network.name].IncomeMaker
    );

    // Naughty pair contract
    const pair = new NaughtyPair__factory(dev_account).attach(pairAddress);

    const balance = await pair.balanceOf(maker.address);
    console.log("income maker lp balance: ", formatUnits(balance, 18));
  });

task("convertIncome", "Convert income from maker to income sharing vault")
  .addParam("token", "naughty token address", null, types.string)
  .setAction(async (taskArgs, hre) => {
    console.log("\nConvert income in income maker...\n");

    const policyTokenAddress = taskArgs.token;

    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    // Income maker contract
    const maker = new IncomeMaker__factory(dev_account).attach(
      addressList[network.name].IncomeMaker
    );

    // Stablecoin address
    let usdAddress: string;
    if (network.name == "avax" || network.name == "avaxTest") {
      usdAddress = getTokenAddressOnAVAX("USDC.e");
    } else {
      usdAddress = addressList[network.name].MockUSD;
    }

    const tx = await maker.convertIncome(policyTokenAddress, usdAddress);
    console.log("Tx details: ", await tx.wait());
  });
