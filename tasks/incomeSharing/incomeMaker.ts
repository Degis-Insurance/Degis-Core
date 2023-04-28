import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import { formatUnits } from "ethers/lib/utils";
import { NaughtyPair__factory } from "../../typechain";

task("getIncomeMakerBalance", "Get income maker lp balance")
  .addParam("pair", "The pool address", null, types.string)
  .setAction(async (taskArgs, hre) => {
    console.log("\nGetting income maker balance...\n");
    const { network, addressList, dev_account } = await hre.run("preparation");
    const pairAddress = taskArgs.pair;

    // Naughty pair contract
    const pair = new NaughtyPair__factory(dev_account).attach(pairAddress);

    const balance = await pair.balanceOf(addressList[network.name].IncomeMaker);
    console.log("income maker lp balance: ", formatUnits(balance, 18));
  });
