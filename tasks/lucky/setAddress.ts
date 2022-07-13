import { task } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import { readAddressList } from "../../scripts/contractAddress";

import {
  DegisLottery,
  DegisLotteryV2,
  DegisLotteryV2__factory,
  DegisLottery__factory,
  InsurancePool__factory,
  RandomNumberGenerator,
  RandomNumberGeneratorV2,
  RandomNumberGeneratorV2__factory,
  RandomNumberGenerator__factory,
  VRFMock,
  VRFMock__factory,
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

task("setVRFMock", "Set the contract addresses inside VRFMock").setAction(
  async (_, hre) => {
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    // Addresses to be set
    const lotteryAddress = addressList[network.name].DegisLotteryV2;

    // Get naughty factory contract instance
    const vrfMockAddress = addressList[network.name].VRFMock;
    const rand: VRFMock = new VRFMock__factory(dev_account).attach(
      vrfMockAddress
    );

    // Set
    const tx = await rand.setLotteryAddress(lotteryAddress);
    console.log("Tx details:", await tx.wait());

    // Check the result
    const lotAddress = await rand.DegisLottery();
    console.log("The lottery inside rand: ", lotAddress);
  }
);

task("setTreasury", "Set the treasury address inside lottery").setAction(
  async (_, hre) => {
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    // Addresses to be set
    const lotteryAddress = addressList[network.name].DegisLotteryV2;

    // Get naughty factory contract instance
    const lottery: DegisLotteryV2 = new DegisLotteryV2__factory(
      dev_account
    ).attach(lotteryAddress);

    // Set
    const tx = await lottery.setTreasury(dev_account.address);
    console.log("Tx details:", await tx.wait());

    // Check the result
    const treasuryAddress = await lottery.treasury();
    console.log("The treasury inside lottery ", treasuryAddress);
  }
);

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

task("setVRF", "Set lottery address in vrf v2").setAction(async (_, hre) => {
  const { network } = hre;

  // Signers
  const [dev_account] = await hre.ethers.getSigners();
  console.log("The default signer is: ", dev_account.address);

  const addressList = readAddressList();

  const lotteryAddress = addressList[network.name].DegisLotteryV2;
  const randAddress = addressList[network.name].RandomNumberGeneratorV2;

  const rand: RandomNumberGeneratorV2 = new RandomNumberGeneratorV2__factory(
    dev_account
  ).attach(randAddress);

  const lottery: DegisLotteryV2 = new DegisLotteryV2__factory(
    dev_account
  ).attach(lotteryAddress);

  const tx = await rand.setDegisLottery(lotteryAddress);
  console.log("Tx details:", await tx.wait());

  // const tx_2 = await lottery.changeRandomGenerator(randAddress);
  // console.log("Tx details:", await tx_2.wait());
});

