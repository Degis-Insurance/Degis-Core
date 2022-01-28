import { task } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import { readAddressList } from "../../scripts/contractAddress";

import { PolicyCore, PolicyCore__factory } from "../../typechain";

task("setNPCore", "Set the contract addresses inside policy core").setAction(
  async (_, hre) => {
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    // Addresses to be set
    const naughtyRouterAddress = addressList[network.name].NaughtyRouter;
    const emergencyPoolAddress = addressList[network.name].EmergencyPool;
    const lotteryAddress = addressList[network.name].DegisLottery;

    // Get policy core contract instance
    const policyCoreAddress = addressList[network.name].PolicyCore;
    const PolicyCore: PolicyCore__factory = await hre.ethers.getContractFactory(
      "PolicyCore"
    );
    const core: PolicyCore = PolicyCore.attach(policyCoreAddress);

    // Set
    const tx_setRouter = await core.setNaughtyRouter(naughtyRouterAddress);
    console.log("Tx_setRouter details:", await tx_setRouter.wait());

    const tx_setEmergency = await core.setEmergencyPool(emergencyPoolAddress);
    console.log("Tx_setEmergency details", await tx_setEmergency.wait());

    const tx_setLottery = await core.setLottery(lotteryAddress);
    console.log("Tx_setLottery details", await tx_setLottery.wait());

    // Check the result
    console.log("Naughty router address in core", await core.naughtyRouter());
    console.log("Degis lottery address in core", await core.lottery());
    console.log("Emergency pool address in core", await core.emergencyPool());
  }
);
