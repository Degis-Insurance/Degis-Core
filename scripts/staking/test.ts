import { formatEther, parseUnits } from "ethers/lib/utils";
import hre from "hardhat";
import { toWei } from "../../test/utils";
import { PolicyFlow, PolicyFlow__factory } from "../../typechain";
import { readAddressList } from "../contractAddress";

async function main() {
  const addressList = readAddressList();

  const { getNamedAccounts, network } = hre;
  console.log(
    "You are testing the proxy policyflow at the ",
    network.name,
    " network"
  );

  const { deployer } = await getNamedAccounts();

  const stakingPoolAddress = "0x303Da5C8F1c997f519209f385C891dC978f270D9";

  const StakingPool = await hre.ethers.getContractFactory("CoreStakingPool");
  const pool = StakingPool.attach(stakingPoolAddress);

  const DegisTokenAddress = addressList[network.name].DegisToken;
  const Degis = await hre.ethers.getContractFactory("DegisToken");
  const degis = Degis.attach(DegisTokenAddress);

  await degis.approve(stakingPoolAddress, toWei("100"));

  //   const pending = await pool.pendingReward();
}

main()
  .then(() => {
    process.exitCode = 0;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
