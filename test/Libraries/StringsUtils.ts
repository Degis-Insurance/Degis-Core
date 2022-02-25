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
    expect(
      await tester.byToString(
        "0x63616e6469646174653100000000000000000000000000000000000000000000"
      )
    ).to.equal(
      "0x63616e6469646174653100000000000000000000000000000000000000000000"
    );
  });

  it("should be able to transfer address to string", async function () {
    // No checksum after transfer
    expect(
      await tester.addressToString("0xaEd009c79E1D7978FD3B87EBe6d1f1FA3C542161")
    ).to.equal("0xaed009c79e1d7978fd3b87ebe6d1f1fa3c542161");
  });

  it("should be able to transfer uint to string", async function () {
    expect(await tester.uintToString(3)).to.equal("3");

    const hexform = await tester.uintToString(2);
    console.log("hex form of 2 is: ", hexform);
  });
});
