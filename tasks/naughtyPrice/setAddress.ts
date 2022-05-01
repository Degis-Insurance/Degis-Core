import { task } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import { readAddressList } from "../../scripts/contractAddress";

import {
  NaughtyFactory,
  NaughtyFactory__factory,
  NaughtyRouter,
  NaughtyRouter__factory,
  PolicyCore,
  PolicyCore__factory,
} from "../../typechain";

task(
  "setNPFactory",
  "Set the contract addresses inside naughty factory"
).setAction(async (_, hre) => {
  console.log("\n Setting Naughty Factory... \n");
  const { network } = hre;

  // Signers
  const [dev_account] = await hre.ethers.getSigners();
  console.log("The default signer is: ", dev_account.address);

  const addressList = readAddressList();

  // Addresses to be set
  const policyCoreAddress = addressList[network.name].PolicyCoreUpgradeable;

  // Get naughty factory contract instance
  const naughtyFactoryAddress = addressList[network.name].NaughtyFactoryUpgradeable;
  const NaughtyFactory: NaughtyFactory__factory =
    await hre.ethers.getContractFactory("NaughtyFactory");
  const factory: NaughtyFactory = NaughtyFactory.attach(naughtyFactoryAddress);

  // Set
  const tx = await factory.setPolicyCoreAddress(policyCoreAddress);
  console.log("Tx details: ", await tx.wait());

  // Check the result
  const coreAddress = await factory.policyCore();
  console.log("The policy core address inside naughty factory: ", coreAddress);
});

task(
  "setNPRouter",
  "Set the contract addresses inside naughty router"
).setAction(async (_, hre) => {
  console.log("\n Setting Naughty Router... \n");
  const { network } = hre;

  // Signers
  const [dev_account] = await hre.ethers.getSigners();
  console.log("The default signer is: ", dev_account.address);

  const addressList = readAddressList();

  // Addresses to be set
  const policyCoreAddress = addressList[network.name].PolicyCoreUpgradeable;

  // Get naughty router contract instance
  const naughtyRouterAddress = addressList[network.name].NaughtyRouterUpgradeable;
  const NaughtyRouter: NaughtyRouter__factory =
    await hre.ethers.getContractFactory("NaughtyRouter");
  const router: NaughtyRouter = NaughtyRouter.attach(naughtyRouterAddress);

  // Set
  const tx = await router.setPolicyCore(policyCoreAddress);
  console.log("Tx details: ", await tx.wait());

  // Check the result
  const coreAddress = await router.policyCore();
  console.log("The policy core address inside naughty router: ", coreAddress);

  const buyerAddress = await router.buyerToken();
  console.log("The buyer token address inside naughty router: ", buyerAddress);
});

task("setNPCore", "Set the contract addresses inside policy core").setAction(
  async (_, hre) => {
    console.log("\n Setting Policy Core... \n");
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    // Addresses to be set
    const naughtyRouterAddress = addressList[network.name].NaughtyRouterUpgradeable;
    const incomeSharingAddress = addressList[network.name].IncomeSharingVault;
    const lotteryAddress = addressList[network.name].DegisLottery;

    // Get policy core contract instance
    const policyCoreAddress = addressList[network.name].PolicyCoreUpgradeable;
    const PolicyCore: PolicyCore__factory = await hre.ethers.getContractFactory(
      "PolicyCore"
    );
    const core: PolicyCore = PolicyCore.attach(policyCoreAddress);

    Set
    const tx_setRouter = await core.setNaughtyRouter(naughtyRouterAddress);
    console.log("Tx_setRouter details: ", await tx_setRouter.wait());

    const tx_setEmergency = await core.setIncomeSharing(incomeSharingAddress);
    console.log("Tx_setEmergency details: ", await tx_setEmergency.wait());

    const tx_setLottery = await core.setLottery(lotteryAddress);
    console.log("Tx_setLottery details: ", await tx_setLottery.wait());

    // Check the result
    console.log("Naughty router address in core: ", await core.naughtyRouter());
    // console.log("Degis lottery address in core: ", await core.lottery());
    // console.log("Emergency pool address in core: ", await core.incomeSharing());
  }
);
