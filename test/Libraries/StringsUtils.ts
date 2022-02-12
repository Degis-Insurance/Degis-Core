import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  SafePRBMathTester,
  SafePRBMathTester__factory,
  StringsUtilsTester,
  StringsUtilsTester__factory,
} from "../../typechain";

describe("SafePRBMath Library", function () {
  let dev_account: SignerWithAddress;

  let StringsUtilsTester: StringsUtilsTester__factory,
    tester: StringsUtilsTester,
    SafePRBMath: SafePRBMathTester__factory,
    math: SafePRBMathTester;

  beforeEach(async function () {
    StringsUtilsTester = await ethers.getContractFactory("StringsUtilsTester");
    tester = await StringsUtilsTester.deploy();

    SafePRBMath = await ethers.getContractFactory("SafePRBMathTester");
    math = await SafePRBMath.deploy();
  });

  it("basic operator", async function () {
    const num_1 = 20;
    const num_2 = 10;

    expect(math.mul(num_1, num_2)).to.be.equal(200);
  });
});
