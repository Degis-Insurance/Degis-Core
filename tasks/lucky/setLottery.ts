import { task } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import { readAddressList } from "../../scripts/contractAddress";

import { DegisLottery, DegisLottery__factory } from "../../typechain";

task("setLottery", "Set the contract addresses inside degis lottery").setAction(
  async (_, hre) => {
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    // Addresses to be set
    const randomNumberGeneratorAddress =
      addressList[network.name].RandomNumberGenerator;

    // Get naughty factory contract instance
    const lotteryAddress = addressList[network.name].DegisLottery;
    const DegisLottery: DegisLottery__factory =
      await hre.ethers.getContractFactory("DegisLottery");
    const lottery: DegisLottery = DegisLottery.attach(lotteryAddress);

    // Set
    const tx = await lottery.setRandomNumberGenerator(
      randomNumberGeneratorAddress
    );
    console.log("Tx details:", await tx.wait());

    // Check the result
    const randAddress = await lottery.randomGenerator();
    console.log("The rand generator inside naughty factory: ", randAddress);
  }
);
