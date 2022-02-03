import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import {
  readAddressList,
  readNaughtyPoolList,
  storeNaughtyPoolList,
} from "../../scripts/contractAddress";

import {
  PolicyCore__factory,
  PolicyCore,
  NaughtyFactory__factory,
  NaughtyFactory,
} from "../../typechain";

task("deployNPPool", "Deploy the swapping pool of naughty price policy token")
  .addParam("name", "Policy token name", null, types.string)
  .addParam("stablecoin", "Address of the stablecoin", null, types.string)
  .addParam("deadline", "Deadline of the swapping pool", null, types.string)
  .addParam("fee", "LP fee rate of the pool", 0, types.int)
  .setAction(async (taskArgs, hre) => {
    // Get args
    const tokenName = taskArgs.name;
    const stablecoinAddress = taskArgs.stablecoin;
    const poolDeadline = taskArgs.deadline;
    const feeRate = taskArgs.fee;
    console.log("Policy token name is: ", tokenName);

    // Network info
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();
    const poolList = readNaughtyPoolList();

    const policyCoreAddress = addressList[network.name].PolicyCore;
    const PolicyCore: PolicyCore__factory = await hre.ethers.getContractFactory(
      "PolicyCore"
    );
    const core: PolicyCore = PolicyCore.attach(policyCoreAddress);

    // Deploy
    const tx = await core.deployPool(
      taskArgs.name,
      stablecoinAddress,
      taskArgs.deadline,
      taskArgs.fee
    );
    console.log("Tx details: ", await tx.wait());

    // Get naughty factory contract instance
    const naughtyFactoryAddress = addressList[network.name].NaughtyFactory;
    const NaughtyFactory: NaughtyFactory__factory =
      await hre.ethers.getContractFactory("NaughtyFactory");
    const factory: NaughtyFactory = NaughtyFactory.attach(
      naughtyFactoryAddress
    );

    // Get the naughty pool's info
    const policyTokenAddress = await core.findAddressbyName(tokenName);
    console.log("Policy token address:", policyTokenAddress);
    const poolAddress = await factory.getPairAddress(
      policyTokenAddress,
      stablecoinAddress
    );
    console.log("Pool address from policyCore: ", poolAddress);

    // Store the naughty pool's info
    const poolObject = {
      poolAddress: poolAddress,
      policyTokenAddress: policyTokenAddress,
      stablecoinAddress: stablecoinAddress,
      poolDeadline: poolDeadline,
      feeRate: feeRate,
    };
    poolList[network.name][taskArgs.name] = poolObject;
    console.log("PoolList Object now: ", poolList);
    storeNaughtyPoolList(poolList);

    await hre.run("addAllowedContractsForNP", { name: tokenName });
  });
