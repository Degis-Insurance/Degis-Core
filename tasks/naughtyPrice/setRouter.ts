import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import { readAddressList } from "../../scripts/contractAddress";

import { NaughtyRouter, NaughtyRouter__factory } from "../../typechain";

task(
  "setNPRouter",
  "Set the contract addresses inside naughty router"
).setAction(async (_, hre) => {
  const { network } = hre;

  // Signers
  const [dev_account] = await hre.ethers.getSigners();
  console.log("The default signer is: ", dev_account.address);

  const addressList = readAddressList();

  // Addresses to be set
  const policyCoreAddress = addressList[network.name].PolicyCore;
  const buyerTokenAddress = addressList[network.name].BuyerToken;

  // Get naughty router contract instance
  const naughtyRouterAddress = addressList[network.name].NaughtyRouter;
  const NaughtyRouter: NaughtyRouter__factory =
    await hre.ethers.getContractFactory("NaughtyRouter");
  const router: NaughtyRouter = NaughtyRouter.attach(naughtyRouterAddress);

  // Set
  const tx_1 = await router.setPolicyCore(policyCoreAddress);
  console.log("Tx details: ", await tx_1.wait());

  const tx_2 = await router.setBuyerToken(buyerTokenAddress);
  console.log("Tx details: ", await tx_2.wait());

  // Check the result
  const coreAddress = await router.policyCore();
  console.log("The policy core address inside naughty router: ", coreAddress);

  const buyerAddress = await router.buyerToken();
  console.log("The buyer token address inside naughty router: ", buyerAddress);
});
