import { task } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import { readAddressList } from "../../scripts/contractAddress";

import {
  DegisLottery,
  DegisLottery__factory,
  InsurancePool__factory,
  RandomNumberGenerator,
  RandomNumberGenerator__factory,
} from "../../typechain";

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

task("setOperator", "Set the operator address for degis lottery").setAction(
  async (_, hre) => {
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    // Addresses to be set
    const insurancePoolAddress = addressList[network.name].InsurancePool;

    // Get naughty factory contract instance
    const lotteryAddress = addressList[network.name].DegisLottery;
    const DegisLottery: DegisLottery__factory =
      await hre.ethers.getContractFactory("DegisLottery");
    const lottery: DegisLottery = DegisLottery.attach(lotteryAddress);

    // Set
    const tx = await lottery.setOperatorAddress(insurancePoolAddress);
    console.log("Tx details:", await tx.wait());

    // Check the result
    const opAddress = await lottery.operatorAddress();
    console.log("The operator is: ", opAddress);
  }
);
