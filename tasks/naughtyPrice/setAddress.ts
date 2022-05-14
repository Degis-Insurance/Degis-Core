import { task } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import { readAddressList } from "../../scripts/contractAddress";

import {
  MockUSD__factory,
  NaughtyFactory,
  NaughtyFactory__factory,
  NaughtyRouter,
  NaughtyRouter__factory,
  PolicyCore,
  PolicyCore__factory,
} from "../../typechain";
import { getTokenAddressOnAVAX } from "../../info/tokenAddress";
import { formatUnits } from "ethers/lib/utils";

task(
  "setNPFactory",
  "Set the contract addresses inside naughty factory"
).setAction(async (_, hre) => {
  console.log("\n Setting Naughty Factory... \n");
  const { network } = hre;

  // Signers
  const [dev_account] = await hre.ethers.getSigners();
  console.log("The default signer is: ", dev_account.address);

  const addressList = readAddressList();

  // Addresses to be set
  const policyCoreAddress = addressList[network.name].PolicyCoreUpgradeable;

  // Get naughty factory contract instance
  const naughtyFactoryAddress =
    addressList[network.name].NaughtyFactoryUpgradeable;
  const factory: NaughtyFactory = new NaughtyFactory__factory(
    dev_account
  ).attach(naughtyFactoryAddress);

  // Set
  const tx = await factory.setPolicyCoreAddress(policyCoreAddress);
  console.log("Tx details: ", await tx.wait());

  // Check the result
  const coreAddress = await factory.policyCore();
  console.log("The policy core address inside naughty factory: ", coreAddress);
});

task(
  "setNPRouter",
  "Set the contract addresses inside naughty router"
).setAction(async (_, hre) => {
  console.log("\n Setting Naughty Router... \n");
  const { network } = hre;

  // Signers
  const [dev_account] = await hre.ethers.getSigners();
  console.log("The default signer is: ", dev_account.address);

  const addressList = readAddressList();

  // Addresses to be set
  const policyCoreAddress = addressList[network.name].PolicyCoreUpgradeable;

  // Get naughty router contract instance
  const naughtyRouterAddress =
    addressList[network.name].NaughtyRouterUpgradeable;
  const NaughtyRouter: NaughtyRouter__factory =
    await hre.ethers.getContractFactory("NaughtyRouter");
  const router: NaughtyRouter = NaughtyRouter.attach(naughtyRouterAddress);

  // Set
  const tx = await router.setPolicyCore(policyCoreAddress);
  console.log("Tx details: ", await tx.wait());

  // Check the result
  const coreAddress = await router.policyCore();
  console.log("The policy core address inside naughty router: ", coreAddress);

  const buyerAddress = await router.buyerToken();
  console.log("The buyer token address inside naughty router: ", buyerAddress);
});

task("setNPCore", "Set the contract addresses inside policy core").setAction(
  async (_, hre) => {
    console.log("\n Setting Policy Core... \n");
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    // Addresses to be set
    const naughtyRouterAddress =
      addressList[network.name].NaughtyRouterUpgradeable;
    const incomeSharingAddress = addressList[network.name].IncomeSharingVault;
    const lotteryAddress = addressList[network.name].DegisLottery;

    // Get policy core contract instance
    const policyCoreAddress = addressList[network.name].PolicyCoreUpgradeable;
    const PolicyCore: PolicyCore__factory = await hre.ethers.getContractFactory(
      "PolicyCore"
    );
    const core: PolicyCore = PolicyCore.attach(policyCoreAddress);

    Set;
    const tx_setRouter = await core.setNaughtyRouter(naughtyRouterAddress);
    console.log("Tx_setRouter details: ", await tx_setRouter.wait());

    const tx_setEmergency = await core.setIncomeSharing(incomeSharingAddress);
    console.log("Tx_setEmergency details: ", await tx_setEmergency.wait());

    const tx_setLottery = await core.setLottery(lotteryAddress);
    console.log("Tx_setLottery details: ", await tx_setLottery.wait());

    // Check the result
    console.log("Naughty router address in core: ", await core.naughtyRouter());
    // console.log("Degis lottery address in core: ", await core.lottery());
    // console.log("Emergency pool address in core: ", await core.incomeSharing());
  }
);

task("setILMInCore", "Set ILM contract address in policy core").setAction(
  async (_, hre) => {
    console.log("\n Setting ILM in policyCore... \n");

    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    const core = new PolicyCore__factory(dev_account).attach(
      addressList[network.name].PolicyCoreUpgradeable
    );

    const ILM = addressList[network.name].ILM;

    const tx = await core.setILMContract(ILM);
    console.log("Tx details: ", await tx.wait());

    console.log("\n Finish setting ILM in policyCore \n");
  }
);

task("checkIncome", "sdsd").setAction(async (_, hre) => {
  const { network } = hre;

  // Signers
  const [dev_account] = await hre.ethers.getSigners();
  console.log("The default signer is: ", dev_account.address);

  const addressList = readAddressList();

  const factory = new NaughtyFactory__factory(dev_account).attach(
    addressList[network.name].NaughtyFactoryUpgradeable
  );
  const feeTo = await factory.incomeMaker();
  console.log("feeTo: ", feeTo);

  const core_old = new PolicyCore__factory(dev_account).attach(
    addressList[network.name].PolicyCore
  );

  const core_new = new PolicyCore__factory(dev_account).attach(
    addressList[network.name].PolicyCoreUpgradeable
  );

  const usdce = getTokenAddressOnAVAX("USDC.e");

  const pendingOldLottery = await core_old.pendingIncomeToLottery(usdce);
  console.log("pending_1: ", formatUnits(pendingOldLottery, 6));
  const pendingOldIncome = await core_old.pendingIncomeToSharing(usdce);
  console.log("pending_1: ", formatUnits(pendingOldIncome, 6));

  const pendingNewLottery = await core_new.pendingIncomeToLottery(usdce);
  console.log("pending_2: ", formatUnits(pendingNewLottery, 6));
  const pendingNewIncome = await core_new.pendingIncomeToSharing(usdce);
  console.log("pending_2: ", formatUnits(pendingNewIncome, 6));

  const usd = new MockUSD__factory(dev_account).attach(usdce);
  const balance = await usd.balanceOf(addressList[network.name].EmergencyPool);
  console.log("balance: ", formatUnits(balance, 6));

  // const tx = await factory.setIncomeMakerAddress(
  //   "0xeB496257B64Cc2D39c291B209F465f3cfADE0873"
  // );
  // console.log("Tx details: ", await tx.wait());
});

task("checkNaughtyPrice", "check naughty price addresses setting").setAction(
  async (_, hre) => {
    console.log("\n Checking Naughty Price Addresses... \n");

    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    const factory = new NaughtyFactory__factory(dev_account).attach(
      addressList[network.name].NaughtyFactoryUpgradeable
    );

    const incomeMakerAddress = await factory.incomeMaker();
    console.log("incomeMakerAddress: ", incomeMakerAddress);

    const incomeMakerProportion = await factory.incomeMakerProportion();
    console.log("incomeMakerProportion: ", incomeMakerProportion.toNumber());

    const policyCoreAddress = await factory.policyCore();
    console.log("policyCoreAddress: ", policyCoreAddress);

    const core = new PolicyCore__factory(dev_account).attach(
      addressList[network.name].PolicyCoreUpgradeable
    );

    const lotteryAddress = await core.lottery();
    console.log("lotteryAddress: ", lotteryAddress);

    const ILMAddress = await core.ILMContract();
    console.log("ILMAddress: ", ILMAddress);

    const incomeSharingAddress = await core.incomeSharing();
    console.log("incomeSharingAddress: ", incomeSharingAddress);

    const routerAddress = await core.naughtyRouter();
    console.log("routerAddress: ", routerAddress);

    const factoryAddress = await core.factory();
    console.log("factoryAddress: ", factoryAddress);

    const toLotteryPart = await core.toLotteryPart();
    console.log("toLotteryPart: ", toLotteryPart.toNumber());

    const router = new NaughtyRouter__factory(dev_account).attach(
      addressList[network.name].NaughtyRouterUpgradeable
    );

    const factoryInRouter = await router.factory();
    console.log("factoryInRouter: ", factoryInRouter);

    const coreInRouter = await router.policyCore();
    console.log("coreInRouter: ", coreInRouter);

    const buyerTokenInRouter = await router.buyerToken();
    console.log("buyerTokenInRouter: ", buyerTokenInRouter);

    console.log("\n Finish Checking Naughty Price Addresses... \n");
  }
);
