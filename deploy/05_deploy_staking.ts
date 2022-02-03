import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { parseUnits } from "ethers/lib/utils";
import { readAddressList, storeAddressList } from "../scripts/contractAddress";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, get } = deployments;

  network.name = network.name == "hardhat" ? "localhost" : network.name;

  const { deployer } = await getNamedAccounts();

  // Read address list from local file
  const addressList = readAddressList();

  const DegisToken = await get("DegisToken");

  const factory = await deploy("StakingPoolFactory", {
    contract: "StakingPoolFactory",
    from: deployer,
    args: [DegisToken.address],
    log: true,
  });
  addressList[network.name].StakingPoolFactory = factory.address;

  // const blockNumber = await ethers.provider.getBlockNumber();

  // const pool = await deploy("CoreStakingPool", {
  //   contract: "CoreStakingPool",
  //   from: deployer,
  //   args: [
  //     DegisToken.address,
  //     DegisToken.address,
  //     factory.address,
  //     blockNumber + 4000,
  //     parseUnits("20"),
  //     false,
  //   ],
  //   log: true,
  // });
  // addressList[network.name].CoreStakingPool = pool.address;

  // Store the address list after deployment
  storeAddressList(addressList);

  // Run some afterwards tasks
  await hre.run("addMinterBurner");
};

func.tags = ["Staking"];
export default func;
