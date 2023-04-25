import "@nomiclabs/hardhat-ethers";
import { readAddressList } from "../../scripts/contractAddress";
import { HardhatRuntimeEnvironment } from "hardhat/types";

// ---------------------------------------------------------------------------------------- //
// *************************************** Types ****************************************** //
// ---------------------------------------------------------------------------------------- //

enum TokenType {
  BuyerToken = "b",
  DegisToken = "d",
}

enum MinterBurner {
  Minter = "minter",
  Burner = "burner",
}

type AddMinterBurnerTaskArgs = {
  type: MinterBurner;
  token: TokenType;
  name: string;
};

// ---------------------------------------------------------------------------------------- //
// ************************************* Task Action ************************************** //
// ---------------------------------------------------------------------------------------- //

export const removeMinterBurnerAction = async (
  taskArgs: AddMinterBurnerTaskArgs,
  hre: HardhatRuntimeEnvironment
) => {
  const { network, ethers } = hre;
  const addressList = readAddressList();

  console.log(
    `\n⏳⏳ Task Start: remove minter or burner ⏳⏳\n`,
    `\n⏳⏳ Network: ${network.name} ⏳⏳\n`
  );

  const tokenName =
    taskArgs.token == TokenType.BuyerToken ? "BuyerToken" : "DegisToken";

  const minterContractName = taskArgs.name;

  // Get the token contract instance
  const TokenContract = await ethers.getContractFactory(tokenName);
  const token = TokenContract.attach(addressList[network.name][tokenName]);

  // Get the minter address to be added
  const newMinterContractAddress =
    addressList[network.name][minterContractName];

  if (newMinterContractAddress == "" || !newMinterContractAddress) {
    console.log("No minter address found");
    return;
  }

  if (taskArgs.type == MinterBurner.Minter) {
    const isAlready = await token.isMinter(newMinterContractAddress);
    if (isAlready) {
      const tx = await token.removeMinter(newMinterContractAddress);
      console.log(await tx.wait());
    } else console.log("Not a minter");
  } else if (taskArgs.type == MinterBurner.Burner) {
    const isAlready = await token.isBurner(newMinterContractAddress);
    if (isAlready) {
      const tx = await token.removeBurner(newMinterContractAddress);
      console.log(await tx.wait());
    } else console.log("Not a burner");
  }

  console.log(`\n✅✅ Task Finish: remove minter or burner ✅✅\n`);
};
