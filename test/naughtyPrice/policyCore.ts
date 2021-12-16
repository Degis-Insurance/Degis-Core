import { expect } from "chai";
import { ethers } from "hardhat";
import { PolicyCore__factory, PolicyCore } from "../../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Policy Core", function () {
  let PolicyCore: PolicyCore__factory, core: PolicyCore;

  let dev_account: SignerWithAddress,
    user1: SignerWithAddress,
    user2: SignerWithAddress,
    user3: SignerWithAddress;

  beforeEach(async function () {
    PolicyCore = await ethers.getContractFactory("PolicyCore");
    core = await PolicyCore.deploy();
    await core.deployed();

    [dev_account, user1, user2, user3] = await ethers.getSigners();
  });
});
