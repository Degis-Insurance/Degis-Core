import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { SafePRBMathTester__factory, SafePRBMathTester } from "../../typechain";
import { stablecoinToWei, toWei } from "../utils";
import { formatEther } from "ethers/lib/utils";

describe("SafePRBMath Library", function () {
  let dev_account: SignerWithAddress;

  let SafePRBMathTester: SafePRBMathTester__factory, tester: SafePRBMathTester;

  beforeEach(async function () {
    [dev_account] = await ethers.getSigners();

    const pubLib = await ethers.getContractFactory("PublicLib");
    // console.log("pubLib", pubLib);

    SafePRBMathTester = await ethers.getContractFactory("SafePRBMathTester");
    tester = await SafePRBMathTester.deploy();
  });

  it("should be able to calculate the avg", async function () {
    expect(await tester.avg(toWei("10"), toWei("30"))).to.equal(toWei("20"));
  });

  it("should be able to calculate the avg with two different decimals", async function () {
    expect(await tester.avg(toWei("10"), stablecoinToWei("30"))).to.not.equal(
      toWei("20")
    );
  });

  it("should be able to calculate the ceil", async function () {
    //
    expect(await tester.ceil(toWei("8.111111111111111111"))).to.equal(
      toWei("9")
    );

    expect(await tester.ceil(toWei("5.911111111111119999"))).to.equal(
      toWei("6")
    );
  });

  it("should be able to calculate the floor", async function () {
    //
    expect(await tester.floor(toWei("8.111111111111111111"))).to.equal(
      toWei("8")
    );

    expect(await tester.floor(toWei("5.911111111111119999"))).to.equal(
      toWei("5")
    );
  });

  it("should be able to calculate the div", async function () {
    expect(await tester.div(toWei("6"), toWei("3"))).to.equal(toWei("2"));

    expect(await tester.div(toWei("6"), toWei("4"))).to.equal(toWei("1.5"));
  });

  it("should be able to calculate the avg with two different decimals", async function () {
    expect(await tester.div(toWei("6"), stablecoinToWei("3"))).to.not.equal(
      toWei("2")
    );
  });

  it("should be able to calculate the e", async function () {
    expect(await tester.e()).to.equal(toWei("2.718281828459045235"));
  });

  it("should be able to calculate the frac", async function () {
    expect(await tester.frac(toWei("2.5"))).to.equal(toWei("0.5"));
  });

  it("should be able to calculate the exp", async function () {
    const result = 2.718281828459045235 ** 2;
    console.log("result is: ", result);

    const res = await tester.exp(toWei("2"));
    console.log("res is: ", formatEther(res));
  });

  it("should be bale to calculate from uint", async function () {
    expect(await tester.fromUint(2)).to.equal(toWei("2"));
  });

  it("should be bale to calculate the gm", async function () {
    expect(await tester.gm(toWei("2"), toWei("8"))).to.equal(toWei("4"));
  });

  it("should be bale to calculate the inv", async function () {
    expect(await tester.inv(toWei("8"))).to.equal(toWei("0.125"));
  });

  it("should be bale to calculate the ln", async function () {
    const res = await tester.ln(toWei("2.718281828459045235"));

    console.log("res is: ", formatEther(res));
  });
  it("should be bale to calculate the log10", async function () {
    expect(await tester.log10(toWei("100"))).to.equal(toWei("2"));
  });

  it("should be bale to calculate the log2", async function () {
    expect(await tester.log2(toWei("8"))).to.equal(toWei("3"));
  });

  it("should be bale to calculate the mul", async function () {
    expect(await tester.mul(toWei("2"), toWei("8"))).to.equal(toWei("16"));
  });

  it("should be bale to calculate the pi", async function () {
    expect(await tester.pi()).to.equal(toWei("3.141592653589793238"));
  });

  it("should be bale to calculate the pow", async function () {
    expect(await tester.pow(toWei("2"), toWei("3"))).to.equal(toWei("8"));
  });

  it("should be bale to calculate the powu", async function () {
    expect(await tester.powu(toWei("2"), 3)).to.equal(toWei("8"));
  });

  it("should be bale to calculate the scale", async function () {
    expect(await tester.scale()).to.equal(toWei("1"));
  });
  it("should be bale to calculate the sqrt", async function () {
    expect(await tester.sqrt(toWei("4"))).to.equal(toWei("2"));
  });
  it("should be bale to calculate the to uint", async function () {
    expect(await tester.toUint(toWei("2"))).to.equal(2);
  });
});
