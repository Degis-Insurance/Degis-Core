import { ethers } from "hardhat";

async function main() {
  const Greeter = await ethers.getContractFactory("NPPolicyToken");
  const greeter = Greeter.attach("0xaa99642E4bD99c99a6473d1572729A5d902F654E");

  console.log("greeter deployed to", greeter.address);

  const res = await greeter.balanceOf(
    "0xe1b1FDD80de3151e392f27CD5D161F793bCF7952"
  );

  console.log("result:", ethers.utils.formatUnits(res, 6));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
