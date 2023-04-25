import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import { readAddressList } from "../../scripts/contractAddress";
import { DegisToken__factory, MockUSD__factory } from "../../typechain";
import { formatUnits, parseUnits } from "ethers/lib/utils";
import { toWei } from "../../test/utils";

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
    const tx = await usd.mint(taskArgs.address, taskArgs.amount);

    console.log(await tx.wait());
  });

task("ILMTestDEG", "Make test deg  for ILM test").setAction(
  async (taskArgs, hre) => {
    const addressList = readAddressList();

    const { network } = hre;

    if (network.name == "avax" || network.name == "avaxTest") return;

    const [dev_account] = await hre.ethers.getSigners();

    const degis = new DegisToken__factory(dev_account).attach(
      addressList[network.name].DegisToken
    );

    const tx_approve = await degis.approve(
      addressList[network.name].MockUSD,
      toWei("1000000000")
    );
    console.log("Tx details", await tx_approve.wait());

    const cap = await degis.CAP();
    console.log("CAP", formatUnits(cap));

    const tx_mint = await degis.mintDegis(
      dev_account.address,
      toWei("1000000000")
    );
    console.log("Tx details", await tx_mint.wait());

    const balance = await degis.balanceOf(dev_account.address);
    console.log("deg balance:", formatUnits(balance));

    const allowance = await degis.allowance(
      dev_account.address,
      addressList[network.name].MockUSD
    );
    console.log("allowance:", formatUnits(allowance));
  }
);
