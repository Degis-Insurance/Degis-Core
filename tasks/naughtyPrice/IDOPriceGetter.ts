import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
// import hre from "hardhat";

import {
  IDOPriceGetter,
  IDOPriceGetter__factory,
  PolicyCore,
  PolicyCore__factory,
  PriceGetter,
  PriceGetter__factory,
} from "../../typechain";
import {
  readAddressList,
  readNaughtyTokenList,
  storeNaughtyTokenList,
} from "../../scripts/contractAddress";
import { formatEther } from "ethers/lib/utils";

// Preset for fuji test
// Deploy a test naughty token "AVAX_15.0_L_8888"
// Deploy a pair on joe
// 0x6D765318b8740856f3027712086e91429fADDBA6 (mockUSD)
// 0xd00ae08403B9bbb9124bB305C09058E32C39A48c (WAVAX)
// pair: 0xb7829401854A550eef15D932CcD221A5e89a89eb
// Add liquidity to the pair
// Add IDO Price feed
// Sample Price

// Test on avaxTest
// JOE: 0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd
// WAVAX: 0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7
// JOE-WAVAX: 0x454E67025631C065d3cFAD6d71E6892f74487a15

// Colony Avalanche Index
// Name: CAI  Network: AVAX_C
// Token Address: 0x48f88A3fE843ccb0b5003e70B4192c1d7448bEf0
// Joe Pair Address: 0xE5e9d67e93aD363a50cABCB9E931279251bBEFd0
// npx hardhat addIDOPriceFeed --network avax --name CAI_88.6_L_1610
//   --decimals 18 --pair 0xE5e9d67e93aD363a50cABCB9E931279251bBEFd0
//   --start 1665820800

// npx hardhat addIDOPriceFeed --network avax --name CAI_97.74_L_0503 --decimals 18 --pair 0xE5e9d67e93aD363a50cABCB9E931279251bBEFd0 --start 1677657600

task("addIDOPriceFeed", "Deploy a new naughty price token")
  .addParam("name", "Policy token name", null, types.string)
  .addOptionalParam("decimals", "Token decimal", 18, types.string)
  .addParam("pair", "Trader joe pair")
  .addOptionalParam("interval", "Sample interval", 600, types.int)
  .addParam("start", "Start time", null, types.string)
  .setAction(async (taskArgs, hre) => {
    const policyTokenName = taskArgs.name;
    const joePair = taskArgs.pair;

    const { network } = hre;

    const addressList = readAddressList();

    const idoPriceGetterAddress = addressList[network.name].IDOPriceGetter;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const idoPriceGetter: IDOPriceGetter = new IDOPriceGetter__factory(
      dev_account
    ).attach(idoPriceGetterAddress);

    const decimals = taskArgs.decimals;
    const sampleInterval = taskArgs.interval; // 10 min
    const startTime = taskArgs.start;

    const tx = await idoPriceGetter.addIDOPair(
      policyTokenName,
      joePair,
      decimals,
      sampleInterval,
      startTime
    );

    console.log("Tx details: ", await tx.wait());
  });

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

  const tx = await idoPriceGetter.samplePrice("AVAX_1.0_L_8896");

  console.log("Tx details: ", await tx.wait());

  const priceGetter: PriceGetter = new PriceGetter__factory(dev_account).attach(
    addressList[network.name].PriceGetter
  );

  const priceFeed = await priceGetter.priceFeedInfo("AVAX");
  console.log("priceFeedInfo: ", priceFeed);
});

task(
  "setIDOPriceGetter",
  "Set ido price getter address in policyCore"
).setAction(async (_, hre) => {
  const { network } = hre;

  const addressList = readAddressList();

  const idoPriceGetterAddress = addressList[network.name].IDOPriceGetter;
  const policyCoreAddress = addressList[network.name].PolicyCoreUpgradeable;

  // Signers
  const [dev_account] = await hre.ethers.getSigners();
  console.log("The default signer is: ", dev_account.address);

  const core: PolicyCore = new PolicyCore__factory(dev_account).attach(
    policyCoreAddress
  );

  const tx = await core.setIDOPriceGetter(idoPriceGetterAddress);
  console.log("Tx details: ", await tx.wait());
});

task("checkIDOPrice", "Check the current ido price").setAction(
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

    const currentPrice = await idoPriceGetter.priceFeeds("CAI_99.87_L_1502");
    console.log("current price: ", formatEther(currentPrice.priceAverage));
  }
);

task("setIDOPrice", "Set IDO price manually").setAction(
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

    const policyTokenName = "CAI_99.87_L_1502";
    const price = ethers.utils.parseEther("5.4");

    const tx = await idoPriceGetter.setPrice(policyTokenName, price);
    console.log("tx details: ", await tx.wait());
  }
);
