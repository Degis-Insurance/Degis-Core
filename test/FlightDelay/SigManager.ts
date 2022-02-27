import { expect } from "chai";
import { ethers } from "hardhat";
import { SigManager, SigManager__factory } from "../../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { keccak256, toUtf8Bytes } from "ethers/lib/utils";

describe("Signature Manager", function () {
  let SigManager: SigManager__factory, sig: SigManager;

  let dev_account: SignerWithAddress;

  beforeEach(async function () {
    [dev_account] = await ethers.getSigners();

    SigManager = await ethers.getContractFactory("SigManager");
    sig = await SigManager.deploy();
  });

  describe("Deployment", function () {
    it("should have the correct owner", async function () {
      expect(await sig.owner()).to.equal(dev_account.address);
    });

    it("should have the correct SUBMIT_TYPE_HASH", async function () {
      const _SUBMIT_CLAIM_TYPEHASH = keccak256(
        toUtf8Bytes("5G is great, physical lab is difficult to find")
      );

      expect(await sig._SUBMIT_APPLICATION_TYPEHASH()).to.equal(
        _SUBMIT_CLAIM_TYPEHASH
      );
    });
  });

  describe("Owner functions", function () {
    it("should be able to add a new signer", async function () {
      expect(await sig.isValidSigner(dev_account.address)).to.equal(false);

      await expect(sig.addSigner(dev_account.address))
        .to.emit(sig, "SignerAdded")
        .withArgs(dev_account.address);

      expect(await sig.isValidSigner(dev_account.address)).to.equal(true);
    });

    it("should not be able to add a new signer twice", async function () {
      expect(await sig.isValidSigner(dev_account.address)).to.equal(false);

      await sig.addSigner(dev_account.address);

      await expect(sig.addSigner(dev_account.address)).to.be.revertedWith(
        "Already a signer"
      );

      expect(await sig.isValidSigner(dev_account.address)).to.equal(true);
    });
    it("should be able to remove a signer", async function () {
      await sig.addSigner(dev_account.address);

      await expect(sig.removeSigner(dev_account.address))
        .to.emit(sig, "SignerRemoved")
        .withArgs(dev_account.address);
    });

    it("should not be able to remove a signer not registered", async function () {
      await expect(sig.removeSigner(dev_account.address)).to.be.revertedWith(
        "Not a signer"
      );
    });
  });
});
