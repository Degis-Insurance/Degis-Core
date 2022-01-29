import { task } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import { readAddressList } from "../../scripts/contractAddress";

import {
  RandomNumberGenerator,
  RandomNumberGenerator__factory,
} from "../../typechain";

task(
  "setRandGenerator",
  "Set the contract addresses inside random number generator"
).setAction(async (_, hre) => {
  const { network } = hre;

  // Signers
  const [dev_account] = await hre.ethers.getSigners();
  console.log("The default signer is: ", dev_account.address);

  const addressList = readAddressList();

  // Addresses to be set
  const lotteryAddress = addressList[network.name].DegisLottery;

  // Get naughty factory contract instance
  const randomNumberGeneratorAddress =
    addressList[network.name].RandomNumberGenerator;
  const RandomGenerator: RandomNumberGenerator__factory =
    await hre.ethers.getContractFactory("RandomNumberGenerator");
  const rand: RandomNumberGenerator = RandomGenerator.attach(
    randomNumberGeneratorAddress
  );

  // Set
  const tx = await rand.setLotteryAddress(lotteryAddress);
  console.log("Tx details:", await tx.wait());

  // Check the result
  const lotAddress = await rand.DegisLottery();
  console.log("The lottery inside rand: ", lotAddress);
});
