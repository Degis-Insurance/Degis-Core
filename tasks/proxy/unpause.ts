import "@nomiclabs/hardhat-ethers";
import { readAddressList } from "../../scripts/contractAddress";
import { HardhatRuntimeEnvironment } from "hardhat/types";

// ---------------------------------------------------------------------------------------- //
// *************************************** Types ****************************************** //
// ---------------------------------------------------------------------------------------- //

type TaskArgs = {
  contract: string;
};

// ---------------------------------------------------------------------------------------- //
// ************************************* Task Action ************************************** //
// ---------------------------------------------------------------------------------------- //

export const unpauseAction = async (
  taskArgs: TaskArgs,
  hre: HardhatRuntimeEnvironment
) => {
  const { network, ethers } = hre;
  const addressList = readAddressList();
  const [dev] = await ethers.getSigners();

  console.log(
    `\n⏳⏳ Task Start: unpause ⏳⏳\n`,
    `\n⏳⏳ Network: ${network.name} ⏳⏳\n`
  );

  const contractToPause = taskArgs.contract;

  const contractAddress = addressList[network.name][contractToPause];
  const contractFactory = await hre.ethers.getContractFactory(contractToPause);
  const contract = contractFactory.attach(contractAddress);

  const tx = await contract.unpause();
  console.log("Tx details: ", await tx.wait());

  console.log("\n✅✅ Task Finish: unpause ✅✅\n");
};
