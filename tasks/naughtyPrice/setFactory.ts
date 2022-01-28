import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import { readAddressList } from "../../scripts/contractAddress";

import { NaughtyFactory, NaughtyFactory__factory } from "../../typechain";

task(
  "setNPFactory",
  "Set the contract addresses inside naughty factory"
).setAction(async (_, hre) => {
  const { network } = hre;

  // Signers
  const [dev_account] = await hre.ethers.getSigners();
  console.log("The default signer is: ", dev_account.address);

  const addressList = readAddressList();

  // Addresses to be set
  const policyCoreAddress = addressList[network.name].PolicyCore;

  // Get naughty factory contract instance
  const naughtyFactoryAddress = addressList[network.name].NaughtyFactory;
  const NaughtyFactory: NaughtyFactory__factory =
    await hre.ethers.getContractFactory("NaughtyFactory");
  const factory: NaughtyFactory = NaughtyFactory.attach(naughtyFactoryAddress);

  // Set
  const tx = await factory.setPolicyCoreAddress(policyCoreAddress);
  console.log("Tx details:", await tx.wait());

  // Check the result
  const coreAddress = await factory.policyCore();
  console.log("The policy core address inside naughty factory", coreAddress);
});
