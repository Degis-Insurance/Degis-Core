import { formatEther, formatUnits } from "ethers/lib/utils";
import hre from "hardhat";
import { getLatestBlockTimestamp, stablecoinToWei } from "../../test/utils";
import {
  NaughtyFactory,
  NaughtyFactory__factory,
  NaughtyPair,
  NaughtyPair__factory,
  NaughtyRouter,
  NaughtyRouter__factory,
  PolicyCore,
  PolicyCore__factory,
} from "../../typechain";
import { readAddressList } from "../contractAddress";

async function main() {
  const addressList = readAddressList();

  const { getNamedAccounts, network } = hre;
  console.log("You are adding new pools at the ", network.name, " network");

  const routerAddress = addressList[network.name].NaughtyRouter;
  const coreAddress = addressList[network.name].PolicyCore;
  const usdAddress = addressList[network.name].MockUSD;
  const factoryAddress = addressList[network.name].NaughtyFactory;

  console.log("The farming pool address of this network is: ", routerAddress);

  // Named accounts
  const { deployer } = await getNamedAccounts();
  console.log("The dev account is: ", deployer);

  // Signers
  const [dev_account] = await hre.ethers.getSigners();
  console.log("The dfault signer is: ", dev_account.address);

  // Get the contract factory and instance
  const NaughtyRouter: NaughtyRouter__factory =
    await hre.ethers.getContractFactory("NaughtyRouter");
  const router: NaughtyRouter = NaughtyRouter.attach(routerAddress);

  const PolicyCore: PolicyCore__factory = await hre.ethers.getContractFactory(
    "PolicyCore"
  );
  const core: PolicyCore = PolicyCore.attach(coreAddress);

  const NaughtyFactory: NaughtyFactory__factory =
    await hre.ethers.getContractFactory("NaughtyFactory");
  const factory: NaughtyFactory = NaughtyFactory.attach(factoryAddress);

  const policyTokenName = "AVAX_100.0_L_0322";

  const policyTokenInfo = await core.policyTokenInfoMapping(policyTokenName);

  const pairAddress = await factory.getPairAddress(
    policyTokenInfo.policyTokenAddress,
    usdAddress
  );

  const NaughtyPair: NaughtyPair__factory = await hre.ethers.getContractFactory(
    "NaughtyPair"
  );
  const pair: NaughtyPair = NaughtyPair.attach(pairAddress);

  const now = await getLatestBlockTimestamp(ethers.provider);

  const usd = new ethers.Contract(
    usdAddress,
    ["function approve(address,uint256)"],
    dev_account
  );
  await usd.approve(core.address, stablecoinToWei("100"));
  await core.deposit(policyTokenName, usdAddress, stablecoinToWei("100"));

  const NPPolicyToken = new ethers.Contract(
    policyTokenInfo.policyTokenAddress,
    ["function approve(address,uint256)"],
    dev_account
  );
  await NPPolicyToken.approve(router.address, stablecoinToWei("100"));
  await usd.approve(router.address, stablecoinToWei("100"));

  //Address to add
  const tx = await router.addLiquidity(
    policyTokenInfo.policyTokenAddress,
    usdAddress,
    stablecoinToWei("100"),
    stablecoinToWei("100"),
    stablecoinToWei("80"),
    stablecoinToWei("80"),
    dev_account.address,
    now + 3000
  );
  console.log("tx details:", await tx.wait());

  const lp_balance = await pair.balanceOf(dev_account.address);
  console.log("LP Balance: ", formatUnits(lp_balance, 6));
}

main()
  .then(() => {
    process.exitCode = 0;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
