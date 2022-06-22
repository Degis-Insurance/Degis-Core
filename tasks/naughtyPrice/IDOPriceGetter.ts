import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
// import hre from "hardhat";

import {
  IDOPriceGetter,
  IDOPriceGetter__factory,
  PolicyCore,
  PolicyCore__factory,
} from "../../typechain";
import {
  readAddressList,
  readNaughtyTokenList,
  storeNaughtyTokenList,
} from "../../scripts/contractAddress";

// Preset for fuji test
// Deploy a test naughty token "AVAX_15.0_L_8888"
// Deploy a pair on joe
// 0x6D765318b8740856f3027712086e91429fADDBA6 (mockUSD)
// 0xd00ae08403B9bbb9124bB305C09058E32C39A48c (WAVAX)
// pair: 0xb7829401854A550eef15D932CcD221A5e89a89eb
// Add liquidity to the pair
// Add IDO Price feed
// Sample Price

task("addIDOPriceFeed", "Deploy a new naughty price token").setAction(
  async (taskArgs, hre) => {
    const { network } = hre;

    const addressList = readAddressList();

    const idoPriceGetterAddress = addressList[network.name].IDOPriceGetter;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const idoPriceGetter: IDOPriceGetter = new IDOPriceGetter__factory(
      dev_account
    ).attach(idoPriceGetterAddress);

    const tx = await idoPriceGetter.addIDOPair(
      "AVAX_15.0_L_8891",
      "0xb7829401854A550eef15D932CcD221A5e89a89eb",
      6,
      60,
      1655910060
    );

    console.log("Tx details: ", await tx.wait());
  }
);

task("samplePrice", "Sample a new price").setAction(async (taskArgs, hre) => {
  const { network } = hre;

  const addressList = readAddressList();

  const idoPriceGetterAddress = addressList[network.name].IDOPriceGetter;

  // Signers
  const [dev_account] = await hre.ethers.getSigners();
  console.log("The default signer is: ", dev_account.address);

  const idoPriceGetter: IDOPriceGetter = new IDOPriceGetter__factory(
    dev_account
  ).attach(idoPriceGetterAddress);

  const tx = await idoPriceGetter.samplePrice("AVAX_15.0_L_8891");

  console.log("Tx details: ", await tx.wait());
});
