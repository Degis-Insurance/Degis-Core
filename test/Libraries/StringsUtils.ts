import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  StringsUtilsTester,
  StringsUtilsTester__factory,
} from "../../typechain";

describe("StringUtils Library", function () {
  let dev_account: SignerWithAddress;

  let StringsUtilsTester: StringsUtilsTester__factory,
    tester: StringsUtilsTester;

  beforeEach(async function () {
    [dev_account] = await ethers.getSigners();

    StringsUtilsTester = await ethers.getContractFactory("StringsUtilsTester");
    tester = await StringsUtilsTester.deploy();
  });

  it("should be able to transfer bytes to string", async function () {
    expect(await tester.byToString("0x0123456789abcdef")).to.equal(
      "0123456789abcdef"
    );
  });

  it("should be able to transfer uint to string", async function () {
    expect(await tester.uintToString(3)).to.equal("3");
  });
});
