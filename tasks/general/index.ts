import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import { formatEther } from "ethers/lib/utils";

task("balance", "get native token balance")
  .addParam("address", "The address of the user", null, types.string)
  .setAction(async (taskArgs, hre) => {
    const userAddress = taskArgs.address;
    console.log("The user address is: ", userAddress);

    const { network } = hre;

    console.log(
      "You are checking native token balance on ---",
      network.name,
      "---"
    );

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    //
    const balance = await hre.ethers.provider.getBalance(userAddress);
    console.log("Native token balance: ", balance.toString());
    console.log("formatEther: ", formatEther(balance));
  });

task("ERC20Balance");
