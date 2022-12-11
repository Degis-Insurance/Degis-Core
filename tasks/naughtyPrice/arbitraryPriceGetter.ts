import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import { readAddressList } from "../../scripts/contractAddress";
import { ArbitraryPriceGetter__factory } from "../../typechain";


// Selector: 99530b06

task("addArbitraryPriceFeed", "Add an arbitrary price feed")
  .addParam("name", "Policy token name", null, types.string)
  .addParam("address", "Price feed address", null, types.string)
  .addParam("sig", "Signature of the price feed", null, types.string)
  .addParam("calldata", "Calldata of the price feed", null, types.string)
  .setAction(async (taskArgs, hre) => {
    // Network info
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    const arbitraryPriceGetter = new ArbitraryPriceGetter__factory(
      dev_account
    ).attach(addressList[network.name].ArbitraryPriceGetter);

    const tx = await arbitraryPriceGetter.addPair(
      taskArgs.name,
      taskArgs.address,
      taskArgs.sig,
      taskArgs.calldata
    );
    console.log("tx details:", await tx.wait());

    const priceFeedInfo = await arbitraryPriceGetter.priceFeeds(taskArgs.name);
    console.log("Price feed info:", priceFeedInfo);

  });
