const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  const Greeter = await ethers.getContractFactory("Greeter");
  const greeter = await Greeter.deploy("Hello");

  await greeter.deployed();

  console.log("greeter deployed to", greeter.address);

  const res = await greeter.doMul(
    ethers.utils.parseEther("3"),
    ethers.utils.parseEther("3")
  );

  console.log("result:", ethers.utils.formatEther(res));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
