import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import { readAddressList } from "../../scripts/contractAddress";

import { NaughtyFactory, NaughtyFactory__factory } from "../../typechain";

task("setPolicyCore", "Set the policyCore contract address").setAction(
  async (_, hre) => {
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    const policyCoreAddress = addressList[network.name].PolicyCore;
    const naughtyFactoryAddress = addressList[network.name].NaughtyFactory;

    const NaughtyFactory: NaughtyFactory__factory =
      await hre.ethers.getContractFactory("NaughtyFactory");

    const factory: NaughtyFactory = NaughtyFactory.attach(
      naughtyFactoryAddress
    );

    const tx_1 = await factory.setPolicyCoreAddress(policyCoreAddress);
    console.log(await tx_1.wait());

    const coreAddress = await factory.policyCore();
    console.log("the policy core address in factory", coreAddress);
  }
);
