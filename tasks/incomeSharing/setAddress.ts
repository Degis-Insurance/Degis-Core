import { task } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import { readAddressList } from "../../scripts/contractAddress";

import {
  NaughtyFactory,
  NaughtyFactory__factory,
  PolicyCore,
  PolicyCore__factory,
  VoteEscrowedDegis,
  VoteEscrowedDegis__factory,
} from "../../typechain";

task(
  "setIncomeMakerInFactory",
  "Set the income maker address inside naughty factory"
).setAction(async (_, hre) => {
  console.log("\nSetting income maker in factory...\n");
  const { network } = hre;

  // Signers
  const [dev_account] = await hre.ethers.getSigners();
  console.log("The default signer is: ", dev_account.address);

  const addressList = readAddressList();

  const factoryAddress = addressList[network.name].NaughtyFactoryUpgradeable;
  const factory: NaughtyFactory = new NaughtyFactory__factory(
    dev_account
  ).attach(factoryAddress);

  const incomeMakerAddress = addressList[network.name].IncomeMaker;

  // Set
  const tx = await factory.setIncomeMakerAddress(incomeMakerAddress);
  console.log("Tx details: ", await tx.wait());

  // Check the result
  const makerAddress = await factory.incomeMaker();
  console.log(
    "The income maker address inside naughty factory: ",
    makerAddress
  );
});

task(
  "setIncomeSharingInCore",
  "Set the income sharing contract address inside policy core"
).setAction(async (_, hre) => {
  const { network } = hre;

  // Signers
  const [dev_account] = await hre.ethers.getSigners();
  console.log("The default signer is: ", dev_account.address);

  const addressList = readAddressList();

  // Addresses to be set
  const incomeSharingAddress = addressList[network.name].IncomeSharingVault;
  const lotteryAddress = addressList[network.name].DegisLottery;

  // Get policy core contract instance
  const policyCoreAddress = addressList[network.name].PolicyCoreUpgradeable;

  const core: PolicyCore = new PolicyCore__factory(dev_account).attach(
    policyCoreAddress
  );

  const oldCoreInstance = new PolicyCore__factory(dev_account).attach(
    addressList[network.name].PolicyCore
  );

  const tx = await oldCoreInstance.setIncomeSharing(incomeSharingAddress);
  console.log("tx details:", await tx.wait());

  const tx_setIncomeSharing = await core.setIncomeSharing(incomeSharingAddress);
  console.log(
    "Tx_setIncomeSharing details: ",
    await tx_setIncomeSharing.wait()
  );

  const tx_setLottery = await core.setLottery(lotteryAddress);
  console.log("Tx_setLottery details: ", await tx_setLottery.wait());

  // Check the result
  console.log("Degis lottery address in core: ", await core.lottery());
  console.log("Income sharing address in core: ", await core.incomeSharing());
});

task(
  "addIncomeSharingWL",
  "Add income sharing contract to veDEG whitelist"
).setAction(async (_, hre) => {
  console.log("\n Adding income sharing contract to veDEG whitelist... \n");

  const { network } = hre;

  // Signers
  const [dev_account] = await hre.ethers.getSigners();
  console.log("The default signer is: ", dev_account.address);

  const addressList = readAddressList();

  // Addresses to be set
  const veDEGAddress = addressList[network.name].VoteEscrowedDegis;
  const veDEG: VoteEscrowedDegis = new VoteEscrowedDegis__factory(
    dev_account
  ).attach(veDEGAddress);

  const incomeSharingAddress = addressList[network.name].IncomeSharingVault;

  const tx = await veDEG.addWhitelist(incomeSharingAddress);
  console.log("Tx details: ", await tx.wait());

  console.log(
    "\n Finish Adding income sharing contract to veDEG whitelist... \n"
  );
});
