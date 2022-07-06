import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import { formatEther } from "ethers/lib/utils";

import abi from "./abi.json";
import {
  IncomeSharingVault,
  IncomeSharingVault__factory,
  VoteEscrowedDegis,
  VoteEscrowedDegis__factory,
} from "../../typechain";
import { readAddressList } from "../../scripts/contractAddress";

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

task("getCallData", "Get call data for functions").setAction(async (_, hre) => {
  // const { network } = hre;
  // // Signers
  // const [dev_account] = await hre.ethers.getSigners();
  // console.log("The default signer is: ", dev_account.address);
  // const multicallContract = new ethers.utils.Interface(abi);
  // const addressList = readAddressList();
  // const veDEG: VoteEscrowedDegis = new VoteEscrowedDegis__factory(
  //   dev_account
  // ).attach(addressList[network.name].VoteEscrowedDegis);
  // const veDEGInterface = new ethers.utils.Interface([
  //   "function unlockVeDEG(address,uint256)",
  // ]);
  // const income: IncomeSharingVault = new IncomeSharingVault__factory(
  //   dev_account
  // ).attach(addressList[network.name].IncomeSharingVault);
  // const userList = [];
  // let callDataArray = [];
  // for (let i = 0; i < userList.length; i++) {
  //   const user = await income.users(1, userList[i]);
  //   const userAmount = user.totalAmount;
  //   const locked = await veDEG.locked(userList[i]);
  //   if (locked.gt(userAmount)) {
  //     console.log("not equal for", i, " -- ", userList[i]);
  //   } else {
  //     console.log("equal for", i, " -- ", userList[i]);
  //   }
  //   const calldata = veDEGInterface.encodeFunctionData("unlockVeDEG", [
  //     userList[i],
  //     locked.sub(userAmount),
  //   ]);
  //   callDataArray.push(calldata);
  // }
  // const target = addressList[network.name].VoteEscrowedDegis;
  // type Call3 = {
  //   targetAddress: string;
  //   calldata: string;
  // };
  // const createCall3 = (value: string, value2: string): Call3 => ({
  //   targetAddress: value,
  //   calldata: value2,
  // });
  // const multicall = new ethers.Contract(
  //   "0xcA11bde05977b3631167028862bE2a173976CA11",
  //   abi,
  //   dev_account
  // );
  // const tx = await multicall.aggregate3(callDataArray);
  // console.log("tx details:", tx);
});
