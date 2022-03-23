import { subtask, task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import { readAddressList } from "../../scripts/contractAddress";
import {
  BuyerToken,
  BuyerToken__factory,
  DegisToken,
  DegisToken__factory,
} from "../../typechain";

task("addMinterBurner", "Add minter for degis/buyer tokens").setAction(
  async (_, hre) => {
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The dfault signer is: ", dev_account.address);

    const addressList = readAddressList();

    // Addresses to be set
    const vaultAddress = addressList[network.name].PurchaseIncentiveVault;
    const policyFlowAddress = addressList[network.name].PolicyFlow;
    const naughtyRouterAddress = addressList[network.name].NaughtyRouter;

    // Tokens to be used
    const degisTokenAddress = addressList[network.name].DegisToken;
    const buyerTokenAddress = addressList[network.name].BuyerToken;

    // Get the contract instance
    const DegisToken: DegisToken__factory = await hre.ethers.getContractFactory(
      "DegisToken"
    );
    const degis: DegisToken = DegisToken.attach(degisTokenAddress);

    const BuyerToken: BuyerToken__factory = await hre.ethers.getContractFactory(
      "BuyerToken"
    );
    const buyerToken: BuyerToken = BuyerToken.attach(buyerTokenAddress);

    // const isAlready_2 = await degis.isMinter(vaultAddress);
    // if (!isAlready_2) {
    //   const tx_2 = await degis.addMinter(vaultAddress);
    //   console.log(await tx_2.wait());
    // }
    // Add minter for buyer token
    const isAlready_3 = await buyerToken.isMinter(naughtyRouterAddress);
    if (!isAlready_3) {
      const tx_3 = await buyerToken.addMinter(naughtyRouterAddress);
      console.log(await tx_3.wait());
    }

    // const isAlready_4 = await buyerToken.isMinter(policyFlowAddress);
    // if (!isAlready_4) {
    //   const tx_4 = await buyerToken.addMinter(policyFlowAddress);
    //   console.log(await tx_4.wait());
    // }
    // // Add burner for buyer token
    // const isAlready_5 = await buyerToken.isBurner(vaultAddress);
    // if (!isAlready_5) {
    //   const tx_5 = await buyerToken.addBurner(vaultAddress);
    //   console.log(await tx_5.wait());
    // }
  }
);

task("addMinter", "add minter manually")
  .addParam("type", "minter or burner", null, types.string)
  .addParam("token", "Which token", null, types.string)
  .addParam("address", "new mitner address", null, types.string)
  .setAction(async (taskArgs, hre) => {
    const tokenName = taskArgs.token;
    const minterAddress = taskArgs.address;

    if (tokenName == "deg") {
      if (taskArgs.type == "m") {
      }
    } else if (tokenName == "buyer") {
    }
  });

subtask("addFarmingMinter", "Add degis minter to farming contract").setAction(
  async (_, hre) => {
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The dfault signer is: ", dev_account.address);

    const addressList = readAddressList();
    const farmingPoolAddress = addressList[network.name].FarmingPool;
    const degisTokenAddress = addressList[network.name].DegisToken;

    // Get the contract instance
    const DegisToken: DegisToken__factory = await hre.ethers.getContractFactory(
      "DegisToken"
    );
    const degis: DegisToken = DegisToken.attach(degisTokenAddress);

    // Add minter for degis token
    const isAlready_1 = await degis.isMinter(farmingPoolAddress);
    if (!isAlready_1) {
      const tx_1 = await degis.addMinter(farmingPoolAddress);
      console.log(await tx_1.wait());
    }
  }
);
