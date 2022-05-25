import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  DegisToken,
  DegisToken__factory,
  FarmingPoolUpgradeable,
  FarmingPoolUpgradeable__factory,
  MockPTP,
  MockPTP__factory,
  MockUSD,
  MockUSD__factory,
  Shield,
  Shield__factory,
  VoteEscrowedDegis,
  VoteEscrowedDegis__factory,
} from "../../typechain";
import { stablecoinToWei } from "../utils";

describe("Shield Token", function () {
  let dev_account: SignerWithAddress;

  let shield: Shield;
  let veDEG: VoteEscrowedDegis;
  let degis: DegisToken;
  let farmingPool: FarmingPoolUpgradeable;
  let mockUSD: MockUSD;
  let ptpPool: MockPTP;

  beforeEach(async function () {
    [dev_account] = await ethers.getSigners();

    mockUSD = await new MockUSD__factory(dev_account).deploy();

    degis = await new DegisToken__factory(dev_account).deploy();
    farmingPool = await new FarmingPoolUpgradeable__factory(
      dev_account
    ).deploy();
    await farmingPool.initialize(degis.address);

    veDEG = await new VoteEscrowedDegis__factory(dev_account).deploy();
    await veDEG.initialize(degis.address, farmingPool.address);

    shield = await new Shield__factory(dev_account).deploy();
    await shield.initialize(veDEG.address);

    ptpPool = await new MockPTP__factory(dev_account).deploy();
  });

  describe("Deployment", function () {
    it("should be able to have the correct owner when deployed", async function () {
      expect(await shield.owner()).to.equal(dev_account.address);
    });

    it("should have the correct stablecoin addresses", async function () {
      expect(await shield.USDC()).to.equal(
        "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E"
      );
      expect(await shield.USDCe()).to.equal(
        "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664"
      );
      expect(await shield.USDT()).to.equal(
        "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7"
      );
      expect(await shield.USDTe()).to.equal(
        "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
      );
      expect(await shield.DAIe()).to.equal(
        "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70"
      );
    });

    it("should have the correct ptpPool address", async function () {
      expect(await shield.PTPPOOL()).to.equal(
        "0x66357dCaCe80431aee0A7507e2E361B7e2402370"
      );
    });

    it("should have the correct veDEG address", async function () {
      expect(await shield.veDEG()).to.equal(veDEG.address);
    });
  });

  describe("Owner Functions", function () {
    it("should be able to add supported stablecoins", async function () {
      await expect(shield.addSupportedStablecoin(mockUSD.address, 120))
        .to.emit(shield, "AddStablecoin")
        .withArgs(mockUSD.address, 120);
    });

    it("should be able to set ptpPool address", async function () {
      await expect(shield.setPTPPool(ptpPool.address))
        .to.emit(shield, "SetPTPPool")
        .withArgs(
          "0x66357dCaCe80431aee0A7507e2E361B7e2402370",
          ptpPool.address
        );
    });
  });

  describe("Main Functions", function () {
    beforeEach(async function () {
      await shield.addSupportedStablecoin(mockUSD.address, 100);
      await shield.setPTPPool(ptpPool.address);
      await shield.approveStablecoin(mockUSD.address);
    });
    it("should be able to deposit stablecoins and get shield", async function () {
      await mockUSD.approve(shield.address, stablecoinToWei("1000"));
      await expect(
        shield.deposit(
          mockUSD.address,
          stablecoinToWei("100"),
          stablecoinToWei("90")
        )
      )
        .to.emit(shield, "Deposit")
        .withArgs(
          dev_account.address,
          mockUSD.address,
          stablecoinToWei("100"),
          stablecoinToWei("100")
        );

      expect(await shield.balanceOf(dev_account.address)).to.equal(
        stablecoinToWei("100")
      );
    });
  });
});
