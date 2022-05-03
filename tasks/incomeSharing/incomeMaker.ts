import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import { readAddressList } from "../../scripts/contractAddress";

import { getTokenAddressOnAVAX } from "../../info/tokenAddress";

import {
  IncomeMaker__factory,
  IncomeSharingVault,
  IncomeSharingVault__factory,
  MockUSD__factory,
  NaughtyPair__factory,
  VoteEscrowedDegis__factory,
} from "../../typechain";
import { formatUnits, parseUnits } from "ethers/lib/utils";

task("getIncomeMakerBalance", "Get income maker lp balance")
  .setAction(async (taskArgs, hre) => {
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    const maker = new IncomeMaker__factory(dev_account).attach(
      addressList[network.name].IncomeMaker
    );

    let usdAddress: string;
    if (network.name == "avax" || network.name == "avaxTest") {
      usdAddress = getTokenAddressOnAVAX("USDC.e");
    } else {
      usdAddress = addressList[network.name].MockUSD;
    }

    const pairAddress = "0xB72cEC598799bcE63B44974cbea0B365083d0241";
    const pair = new NaughtyPair__factory(dev_account).attach(pairAddress);

    const balance = await pair.balanceOf(maker.address);
    console.log("maker lp balance: ", formatUnits(balance, 6));

    
  });


  task("convertIncome", "Convert income from maker to income sharing vault")
  .addParam("token", "naughty token address", null, types.string)
  .setAction(async (taskArgs, hre) => {
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    const maker = new IncomeMaker__factory(dev_account).attach(
      addressList[network.name].IncomeMaker
    );


    let usdAddress: string;
    if (network.name == "avax" || network.name == "avaxTest") {
      usdAddress = getTokenAddressOnAVAX("USDC.e");
    } else {
      usdAddress = addressList[network.name].MockUSD;
    }


    const pairAddress = "0xB72cEC598799bcE63B44974cbea0B365083d0241"
    const pair = new NaughtyPair__factory(dev_account).attach(pairAddress)

    const balance = await pair.balanceOf(maker.address);
    console.log("maker lp balance: ", formatUnits(balance, 6));

    const tx = await maker.convertIncome(taskArgs.token, usdAddress);
    console.log("Tx details: ", await tx.wait());
  });