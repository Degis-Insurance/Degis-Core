import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
// import hre from "hardhat";

import { FarmingPool, FarmingPool__factory } from "../../typechain";
import { readAddressList } from "../../scripts/contractAddress";
import { parseUnits } from "ethers/lib/utils";

task("addPool", "Add new farming pool")
  .addParam("address", "The pool's address to be added", null, types.string)
  .addParam("reward", "Initial degis reward per block", null, types.int)
  .setAction(async (taskArgs, hre) => {
    console.log("Pool address to be added: ", taskArgs.address);

    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The dfault signer is: ", dev_account.address);

    const addressList = readAddressList();
    const farmingPoolAddress = addressList[network.name].FarmingPool;

    console.log(
      "The farming pool address of this network is: ",
      farmingPoolAddress
    );

    const FarmingPool: FarmingPool__factory =
      await hre.ethers.getContractFactory("FarmingPool");
    const farmingPool: FarmingPool = FarmingPool.attach(farmingPoolAddress);

    const tx = await farmingPool.add(
      taskArgs.address,
      parseUnits(taskArgs.reward),
      false
    );
    console.log("tx details: ",await tx.wait());
  });
