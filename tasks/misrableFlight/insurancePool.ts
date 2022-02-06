import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import { readAddressList } from "../../scripts/contractAddress";

import { InsurancePool, InsurancePool__factory } from "../../typechain";

task("setFrozenTime", "Set the frozen time for withdraw")
  .addParam("time", "The frozen time to be set", null, types.int)
  .setAction(async (taskArgs, hre) => {
    const frozenTime = taskArgs.time;

    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    // Get  contract instance
    const insurancePoolAddress = addressList[network.name].InsurancePool;
    const InsurancePool: InsurancePool__factory =
      await hre.ethers.getContractFactory("InsurancePool");
    const pool: InsurancePool = InsurancePool.attach(insurancePoolAddress);

    // Set
    const tx = await pool.setFrozenTime(frozenTime);
    console.log("Tx details:", await tx.wait());

    // Check the result
    const froz = await pool.frozenTime();
    console.log("Current frozen time: ", froz);
  });
