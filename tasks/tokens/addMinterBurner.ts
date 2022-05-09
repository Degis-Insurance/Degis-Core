import { subtask, task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import { readAddressList } from "../../scripts/contractAddress";
import {
  BuyerToken,
  BuyerToken__factory,
  DegisToken,
  DegisToken__factory,
} from "../../typechain";

// npx hardhat addMinterBurner --type minter --token d --name StakingPoolFactory --network avax
task("addMinterBurner", "add minter/burner manually")
  .addParam("type", "minter or burner", null, types.string)
  .addParam("token", "Which token", null, types.string)
  .addParam("name", "new minter name", null, types.string)
  .setAction(async (taskArgs, hre) => {
    console.log("\nAdding minter or burner...\n");

    // Token "b" or "d"
    let tokenName;
    if (taskArgs.token == "b") tokenName = "BuyerToken";
    else if (taskArgs.token == "d") tokenName = "DegisToken";
    else {
      console.log("Invalid token name");
      return;
    }
    const minterContractName = taskArgs.name;

    const addressList = readAddressList();

    const { network } = hre;

    // Get the token contract instance
    const TokenContract = await hre.ethers.getContractFactory(tokenName);
    const token = TokenContract.attach(addressList[network.name][tokenName]);

    // Get the minter address to be added
    const newMinterContract = addressList[network.name][minterContractName];

    if (newMinterContract == "" || !newMinterContract) {
      console.log("No minter address found");
      return;
    }


    if (taskArgs.type == "minter") {
      // Add minter
      const isAlready = await token.isMinter(newMinterContract);
      if (!isAlready) {
        const tx = await token.addMinter(newMinterContract);
        console.log(await tx.wait());
      }
      else console.log("Already minter")
    } else if (taskArgs.type == "burner") {
      // Add burner
      const isAlready = await token.isBurner(newMinterContract);
      if (!isAlready) {
        const tx = await token.addBurner(newMinterContract);
        console.log(await tx.wait());
      }
      else console.log("Already burner")
    }

    console.log("\nFinish Adding minter or burner...\n");
  });

task("addStakingMinter", "add staking minter manually")
  .addParam("address", "staking minter address", null, types.string)
  .setAction(async (taskArgs, hre) => {
    const minterAddress = taskArgs.address;

    const addressList = readAddressList();

    const { network } = hre;

    // Get the token contract instance
    const DegisToken: DegisToken__factory = await hre.ethers.getContractFactory(
      "DegisToken"
    );
    const degis: DegisToken = DegisToken.attach(
      addressList[network.name]["DegisToken"]
    );

    const isAlready = await degis.isMinter(minterAddress);
    if (!isAlready) {
      const tx = await degis.addMinter(minterAddress);
      console.log(await tx.wait());
    }
  });

task("addFarmingMinter", "Add degis minter to farming contract").setAction(
  async (_, hre) => {
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();
    const farmingPoolAddress = addressList[network.name].FarmingPoolUpgradeable;
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

subtask(
  "addRouterMinter",
  "Add buyer minter to naughty router contract"
).setAction(async (_, hre) => {
  const { network } = hre;

  // Signers
  const [dev_account] = await hre.ethers.getSigners();
  console.log("The dfault signer is: ", dev_account.address);

  const addressList = readAddressList();
  const routerAddress = addressList[network.name].NaughtyRouter;
  const buyerTokenAddress = addressList[network.name].BuyerToken;

  // Get the contract instance
  const BuyerToken: BuyerToken__factory = await hre.ethers.getContractFactory(
    "BuyerToken"
  );
  const buyer: BuyerToken = BuyerToken.attach(buyerTokenAddress);

  // Add minter for degis token
  const isAlready_1 = await buyer.isMinter(routerAddress);
  if (!isAlready_1) {
    const tx_1 = await buyer.addMinter(routerAddress);
    console.log(await tx_1.wait());
  }
});

task("addAllMinterBurner", "Add minter for degis/buyer tokens").setAction(
  async (_, hre) => {
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The dfault signer is: ", dev_account.address);

    const addressList = readAddressList();

    // Addresses to be set
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

    const isAlready_1 = await buyerToken.isMinter(naughtyRouterAddress);
    if (!isAlready_1) {
      const tx_1 = await buyerToken.addMinter(naughtyRouterAddress);
      console.log(await tx_1.wait());
    }
  }
);
