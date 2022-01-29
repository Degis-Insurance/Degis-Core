import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
// import hre from "hardhat";

import { CoreStakingPool, CoreStakingPool__factory } from "../../typechain";
import { readAddressList } from "../../scripts/contractAddress";
import { formatEther, parseUnits } from "ethers/lib/utils";

task("setStakingReward", "Set the degis reward of a staking pool")
  .addParam("reward", "Degis reward per block", null, types.int)
  .setAction(async (taskArgs, hre) => {
    // Get the args
    const degisPerBlock = taskArgs.reward;
    console.log("New reward speed: ", degisPerBlock, "degis/block");

    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The dfault signer is: ", dev_account.address);

    const addressList = readAddressList();
    const stakingPoolAddress = addressList[network.name].CoreStakingPool;

    console.log(
      "The staking pool address of this network is: ",
      stakingPoolAddress
    );

    const StakingPool: CoreStakingPool__factory =
      await hre.ethers.getContractFactory("CoreStakingPool");
    const pool: CoreStakingPool = StakingPool.attach(stakingPoolAddress);

    // Set the start block
    const tx = await pool.setDegisPerBlock(
      parseUnits(degisPerBlock.toString())
    );
    console.log("Tx details: ", await tx.wait());

    // Check the result
    const degisR = await pool.degisPerBlock();
    console.log("Degis reward after set: ", formatEther(degisR));
  });
