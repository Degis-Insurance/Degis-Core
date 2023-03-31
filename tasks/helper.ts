import { task } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import { readAddressList } from "../scripts/contractAddress";

task("preparation", "preparation for the task").setAction(async (_, hre) => {
  const { network } = hre;
  const [dev_account] = await hre.ethers.getSigners();
  const addressList = readAddressList();

  return { network, addressList, dev_account };
});
