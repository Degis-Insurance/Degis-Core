import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import { readAddressList } from "../../scripts/contractAddress";
import { PolicyFlow, PolicyFlow__factory } from "../../typechain";
import { signNewApplication } from "../../scripts/signMessage";
import { parseUnits } from "ethers/lib/utils";
import { getNow } from "../../test/utils";
// import hre from "hardhat";

task("settleFDPolicy", "Settle a flight delay policy")
  .addParam("id", "policyId", null, types.int)
  .addParam("flight", "flightnumber", null, types.string)
  .addParam("timestamp", "departuretimestamp", null, types.int)
  .addParam("path", "path to get the return result", null, types.string)
  .addParam("update", "whether to force update", false, types.boolean)
  .setAction(async (taskArgs, hre) => {
    // Get the args
    const policyId = taskArgs.id;
    const flightNumber = taskArgs.flight;
    const departureTimestamp = taskArgs.timestamp;
    const path = taskArgs.path;
    const forceUpdate = taskArgs.update;

    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    // Load contract instance
    const policyFlowAddress = addressList[network.name].PolicyFlow;
    const PolicyFlow: PolicyFlow__factory = await hre.ethers.getContractFactory(
      "PolicyFlow"
    );
    const flow: PolicyFlow = PolicyFlow.attach(policyFlowAddress);

    const info = await flow.getPolicyInfoById(policyId);
    console.log(info.departureTimestamp.toNumber());
    console.log(info.buyerAddress);

    const tx = await flow.newClaimRequest(
      policyId,
      flightNumber,
      departureTimestamp,
      path,
      forceUpdate
    );
    console.log("Tx details: ", await tx.wait());
  });

task("buyFDPolicy", "Buy a flight delay policy")
  .addParam("product", "productId", 0, types.int)
  .addParam("flight", "flightnumber", null, types.string)
  .addParam("premium", "premium", null, types.int)
  .addParam("departure", "departuretimestamp", null, types.int)
  .addParam("landing", "landingtimestamp", null, types.int)
  .setAction(async (taskArgs, hre) => {
    // Get the args
    const productId = taskArgs.product;
    const flightNumber = taskArgs.flight;
    const premium = taskArgs.premium;
    const departureTimestamp = taskArgs.departure;
    const landingTimestamp = taskArgs.landing;

    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    // Load contract instance
    const policyFlowAddress = addressList[network.name].PolicyFlow;
    const PolicyFlow: PolicyFlow__factory = await hre.ethers.getContractFactory(
      "PolicyFlow"
    );
    const flow: PolicyFlow = PolicyFlow.attach(policyFlowAddress);

    // Bought for dev account
    const sig = await signNewApplication(
      dev_account.address,
      flightNumber,
      premium
    );

    const deadline = getNow() + 300;

    const tx = await flow.newApplication(
      productId,
      flightNumber,
      parseUnits(premium),
      ethers.BigNumber.from(departureTimestamp),
      ethers.BigNumber.from(landingTimestamp),
      deadline,
      sig
    );
    console.log("Tx details: ", await tx.wait());
  });
