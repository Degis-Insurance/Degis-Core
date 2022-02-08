/**
 * @dev This is only used for testnet v2
 */

import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import { readAddressList } from "../../scripts/contractAddress";
import {
  MockUSD,
  MockUSD__factory,
  BuyerToken,
  BuyerToken__factory,
  DegisToken,
  DegisToken__factory,
  PolicyCore__factory,
  PolicyCore,
  NaughtyFactory__factory,
  NaughtyFactory,
  NPPolicyToken__factory,
  NPPolicyToken,
  NaughtyPair__factory,
  NaughtyPair,
  InsurancePool__factory,
} from "../../typechain";

// Allowed contracts
//
//      MockUSD:
//           - InsurancePool (for provide & buy flight delay)
//      DegisToken:
//           - FarmingPool (for farming)
//           - Lottery (for buying tickets)
//           - Staking Pool (for staking)
//      BuyerToken:
//           - PurchaseIncentiveVault (for buyer incentive)
//

task("addAllowedContracts", "Add allowed contracts for all tokens").setAction(
  async (_, hre) => {
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    // Addresses to be set
    const insurancePoolAddress = addressList[network.name].InsurancePool;
    const policyCoreAddress = addressList[network.name].PolicyCore;
    const policyFlowAddress = addressList[network.name].PolicyFlow;
    const farmingPoolAddress = addressList[network.name].FarmingPool;
    const lotteryAddress = addressList[network.name].DegisLottery;
    const vaultAddress = addressList[network.name].PurchaseIncentiveVault;
    const naughtyRouterAddress = addressList[network.name].NaughtyRouter;
    const naughtyFactoryAddress = addressList[network.name].NaughtyFactory;
    const emergencyPoolAddress = addressList[network.name].EmergencyPool;

    const allowedContracts = [
      insurancePoolAddress,
      policyCoreAddress,
      policyFlowAddress,
      farmingPoolAddress,
      lotteryAddress,
      vaultAddress,
      naughtyRouterAddress,
      naughtyFactoryAddress,
      emergencyPoolAddress,
    ];
    console.log("allowedcontracts: ", allowedContracts);

    // Tokens to be used
    const mockUSDAddress = addressList[network.name].MockUSD;
    const buyerTokenAddress = addressList[network.name].BuyerToken;
    const degisTokenAddress = addressList[network.name].DegisToken;

    // Get the contract instance
    const MockUSD: MockUSD__factory = await hre.ethers.getContractFactory(
      "MockUSD"
    );
    const usd: MockUSD = MockUSD.attach(mockUSDAddress);

    const BuyerToken: BuyerToken__factory = await hre.ethers.getContractFactory(
      "BuyerToken"
    );
    const buyerToken: BuyerToken = BuyerToken.attach(buyerTokenAddress);

    const DegisToken: DegisToken__factory = await hre.ethers.getContractFactory(
      "DegisToken"
    );
    const degis: DegisToken = DegisToken.attach(degisTokenAddress);

    // Add allowed contracts for tokens
    const tx_1 = await usd.setAllowedRecipients(allowedContracts);
    console.log("Tx1 details: ", await tx_1.wait());

    const tx_2 = await usd.setAllowedSenders(allowedContracts);
    console.log("Tx2 details: ", await tx_2.wait());

    const tx_3 = await buyerToken.setAllowedRecipients(allowedContracts);
    console.log("Tx3 details: ", await tx_3.wait());

    const tx_4 = await buyerToken.setAllowedSenders(allowedContracts);
    console.log("Tx4 details: ", await tx_4.wait());

    const tx_5 = await degis.setAllowedRecipients(allowedContracts);
    console.log("Tx5 details: ", await tx_5.wait());

    const tx_6 = await degis.setAllowedSenders(allowedContracts);
    console.log("Tx6 details: ", await tx_6.wait());
  }
);

task("addAllowedContractsForNP", "Add allowed contracts for NP pair lp tokens")
  .addParam("name", "token name", null, types.string)
  .setAction(async (taskArgs, hre) => {
    console.log(
      "adding allowed contracts for NP pair lp tokens: ",
      taskArgs.name
    );
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    const usdAddress = addressList[network.name].MockUSD;

    const farmingPoolAddress = addressList[network.name].FarmingPool;

    const policyCoreAddress = addressList[network.name].PolicyCore;
    const PolicyCore: PolicyCore__factory = await hre.ethers.getContractFactory(
      "PolicyCore"
    );
    const core: PolicyCore = PolicyCore.attach(policyCoreAddress);

    // Get naughty factory contract instance
    const naughtyFactoryAddress = addressList[network.name].NaughtyFactory;
    const NaughtyFactory: NaughtyFactory__factory =
      await hre.ethers.getContractFactory("NaughtyFactory");
    const factory: NaughtyFactory = NaughtyFactory.attach(
      naughtyFactoryAddress
    );

    const tokenAddress = await core.findAddressbyName(taskArgs.name);
    const NPToken: NPPolicyToken__factory = await hre.ethers.getContractFactory(
      "NPPolicyToken"
    );
    const nptoken: NPPolicyToken = NPToken.attach(tokenAddress);

    const pairAddress = await factory.getPairAddress(tokenAddress, usdAddress);
    const NPPair: NaughtyPair__factory = await hre.ethers.getContractFactory(
      "NaughtyPair"
    );
    const nppair: NaughtyPair = NPPair.attach(pairAddress);

    const naughtyRouterAddress = addressList[network.name].NaughtyRouter;

    const allowedContracts: string[] = [
      pairAddress,
      naughtyRouterAddress,
      policyCoreAddress,
      naughtyFactoryAddress,
      farmingPoolAddress,
    ];

    const tx_1 = await nptoken.setAllowedRecipients(allowedContracts);
    console.log("Tx1 details: ", await tx_1.wait());

    const tx_2 = await nptoken.setAllowedSenders(allowedContracts);
    console.log("Tx2 details: ", await tx_2.wait());

    const tx_3 = await nppair.setAllowedRecipients(allowedContracts);
    console.log("Tx3 details: ", await tx_3.wait());

    const tx_4 = await nppair.setAllowedSenders(allowedContracts);
    console.log("Tx4 details: ", await tx_4.wait());

    // Tokens to be used
    const mockUSDAddress = addressList[network.name].MockUSD;
    const buyerTokenAddress = addressList[network.name].BuyerToken;
    const degisTokenAddress = addressList[network.name].DegisToken;

    // Get the contract instance
    const MockUSD: MockUSD__factory = await hre.ethers.getContractFactory(
      "MockUSD"
    );
    const usd: MockUSD = MockUSD.attach(mockUSDAddress);

    const BuyerToken: BuyerToken__factory = await hre.ethers.getContractFactory(
      "BuyerToken"
    );
    const buyerToken: BuyerToken = BuyerToken.attach(buyerTokenAddress);

    const DegisToken: DegisToken__factory = await hre.ethers.getContractFactory(
      "DegisToken"
    );
    const degis: DegisToken = DegisToken.attach(degisTokenAddress);

    const tx_5 = await usd.setAllowedRecipients(allowedContracts);
    console.log("Tx5 details: ", await tx_5.wait());

    const tx_6 = await usd.setAllowedSenders(allowedContracts);
    console.log("Tx6 details: ", await tx_6.wait());

    const tx_7 = await buyerToken.setAllowedRecipients(allowedContracts);
    console.log("Tx7 details: ", await tx_7.wait());

    const tx_8 = await buyerToken.setAllowedSenders(allowedContracts);
    console.log("Tx8 details: ", await tx_8.wait());

    const tx_9 = await degis.setAllowedRecipients(allowedContracts);
    console.log("Tx9 details: ", await tx_9.wait());

    const tx_10 = await degis.setAllowedSenders(allowedContracts);
    console.log("Tx10 details: ", await tx_10.wait());
  });

task(
  "addAllowedContractsForFD",
  "Add allowed contracts for flight delay pair lp tokens"
).setAction(async (_, hre) => {
  console.log("Adding allowed contracts for flight delay lp token: \n");

  const { network } = hre;

  // Signers
  const [dev_account] = await hre.ethers.getSigners();
  console.log("The default signer is: ", dev_account.address);

  const addressList = readAddressList();

  const insurancePoolAddress = addressList[network.name].InsurancePool;

  const InsurancePool: InsurancePool__factory =
    await hre.ethers.getContractFactory("InsurancePool");
  const pool = InsurancePool.attach(insurancePoolAddress);

  const farmingPoolAddress = addressList[network.name].FarmingPool;

  const allowedContracts: string[] = [farmingPoolAddress, insurancePoolAddress];

  const tx_1 = await pool.setAllowedRecipients(allowedContracts);
  console.log("Tx1 details: ", await tx_1.wait());

  const tx_2 = await pool.setAllowedSenders(allowedContracts);
  console.log("Tx2 details: ", await tx_2.wait());
});
