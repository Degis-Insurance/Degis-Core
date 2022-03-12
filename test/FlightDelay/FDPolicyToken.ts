import { expect } from "chai";
import { ethers } from "hardhat";
import {
  FDPolicyToken,
  FDPolicyToken__factory,
  PolicyFlow,
  PolicyFlow__factory,
} from "../../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { zeroAddress } from "../utils";
import { deployments } from "hardhat";

describe("Flight Delay Policy Token", function () {
  let FDPolicyToken: FDPolicyToken__factory,
    fdToken: FDPolicyToken,
    PolicyFlow: PolicyFlow__factory,
    flow: PolicyFlow;

  let dev_account: SignerWithAddress,
    user1: SignerWithAddress,
    user2: SignerWithAddress,
    policyflow: SignerWithAddress;

  beforeEach(async function () {
    [dev_account, user1, user2, policyflow] = await ethers.getSigners();

    FDPolicyToken = await ethers.getContractFactory("FDPolicyToken");
    fdToken = await FDPolicyToken.deploy();
    await fdToken.deployed();
  });

  describe("Deployment", function () {
    it("should have correct name and symbol", async function () {
      expect(await fdToken.name()).to.equal("Degis FlightDelay PolicyToken");
      expect(await fdToken.symbol()).to.equal("DEGIS_FD_PT");
    });

    it("should set the deployer as the owner", async function () {
      expect(await fdToken.owner()).to.equal(dev_account.address);
    });

    it("should be able to transfer ownership", async function () {
      await expect(fdToken.transferOwnership(zeroAddress())).to.be.revertedWith(
        "Ownable: new owner is the zero address"
      );

      await expect(fdToken.transferOwnership(user1.address))
        .to.emit(fdToken, "OwnershipTransferred")
        .withArgs(dev_account.address, user1.address);

      expect(await fdToken.owner()).to.equal(user1.address);

      await expect(fdToken.transferOwnership(user2.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("should be able to renounce ownership", async function () {
      await expect(fdToken.renounceOwnership())
        .to.emit(fdToken, "OwnershipTransferred")
        .withArgs(dev_account.address, zeroAddress());
    });

    it("_nextId should start from 1", async function () {
      expect(await fdToken._nextId()).to.equal(1);
    });
  });

  describe("Basic functions", function () {
    it("should not query a incorrect tokenId", async function () {
      const nextId = await fdToken._nextId();
      await expect(fdToken.tokenURI(nextId)).to.be.revertedWith(
        "TokenId is too large!"
      );
    });

    it("should not be able to mint policy tokens before setting the policyflow address", async function () {
      await expect(fdToken.mintPolicyToken(user1.address)).to.be.revertedWith(
        "Only the policyflow contract can mint fd policy token"
      );
    });

    it("should set the policyflow address successfully", async function () {
      await fdToken.updatePolicyFlow(policyflow.address);
      expect(await fdToken.policyFlow()).to.equal(policyflow.address);
    });

    // it("should mint policy tokens successfully by the new policyflow address", async function () {
    //   const nextId = await fdToken._nextId();
    //   await fdToken.updatePolicyFlow(flow.address);

    //   await expect(fdToken.connect(flow).mintPolicyToken(user1.address))
    //     .to.emit(fdToken, "Transfer")
    //     .withArgs(ethers.constants.AddressZero, user1.address, nextId);
    // });
  });
});
