import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import { readAddressList } from "../../scripts/contractAddress";
import { DegisToken__factory, MockUSD__factory } from "../../typechain";
import { formatUnits } from "ethers/lib/utils";
import { toWei } from "../../test/utils";

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
    const tx = await usd.mint(taskArgs.address, taskArgs.amount);

    console.log(await tx.wait());
  });