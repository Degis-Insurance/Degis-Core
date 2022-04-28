import { subtask, task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import { readAddressList } from "../../scripts/contractAddress";
import {
  BuyerToken,
  BuyerToken__factory,
  DegisToken,
  DegisToken__factory,
  MockUSD__factory,
} from "../../typechain";
import { parseUnits } from "ethers/lib/utils";

// npx hardhat addMinterBurner --type minter --token d --name StakingPoolFactory --network avax
task("mintBuyerToken", "mint buyer token")
  .addParam("address", "minter or burner", null, types.string)
  .addParam("amount", "Which token", null, types.string)
  .setAction(async (taskArgs, hre) => {
    const addressList = readAddressList();

    const { network } = hre;

    // Get the token contract instance
    const BuyerToken = await hre.ethers.getContractFactory("BuyerToken");
    const token = BuyerToken.attach(addressList[network.name].BuyerToken);

    // Add minter
    const tx = await token.mintBuyerToken(
      taskArgs.address,
      parseUnits(taskArgs.amount)
    );

    console.log(await tx.wait());
  });

task("mintDegisToken", "mint degis token")
  .addParam("address", "minter or burner", null, types.string)
  .addParam("amount", "Which token", null, types.string)
  .setAction(async (taskArgs, hre) => {
    const addressList = readAddressList();

    const { network } = hre;

    const [dev_account] = await hre.ethers.getSigners();

    // Get the token contract instance
    const degis = new DegisToken__factory(dev_account).attach(
      addressList[network.name].DegisToken
    );

    // Add minter
    const tx = await degis.mintDegis(
      taskArgs.address,
      parseUnits(taskArgs.amount)
    );

    console.log(await tx.wait());
  });

task("mintUSD", "mint degis token")
  .addParam("address", "minter or burner", null, types.string)
  .addParam("amount", "Which token", null, types.string)
  .setAction(async (taskArgs, hre) => {
    const addressList = readAddressList();

    const { network } = hre;

    if (network.name == "avax" || network.name == "avaxTest") return;

    const [dev_account] = await hre.ethers.getSigners();

    // Get the token contract instance
    const usd = new MockUSD__factory(dev_account).attach(
      addressList[network.name].MockUSD
    );

    // Add minter
    const tx = await usd.mint(taskArgs.address, parseUnits(taskArgs.amount, 6));

    console.log(await tx.wait());
  });
