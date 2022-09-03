import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

import {
  readAddressList,
  readILMList,
  storeILMList,
} from "../../scripts/contractAddress";
import { getTokenAddressOnAVAX } from "../../info/tokenAddress";

import {
  NaughtyPriceILM__factory,
  PolicyCore,
  PolicyCore__factory,
} from "../../typechain";
import { formatEther, formatUnits } from "ethers/lib/utils";
import { BigNumber, BigNumberish } from "ethers";
import { stablecoinToWei } from "../../test/utils";

task("startILM", "Start a new round ILM")
  .addParam("policytoken", "Policy token address", null, types.string)
  .addParam("stablecoin", "Stablecoin address", null, types.string)
  .addParam("deadline", "ILM deadline", null, types.string)
  .setAction(async (taskArgs, hre) => {
    console.log("\n Starting a new round ILM... \n");
    // Network info
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();
    const ILMList = readILMList();

    const ILM = new NaughtyPriceILM__factory(dev_account).attach(
      addressList[network.name].ILM
    );
    const core = new PolicyCore__factory(dev_account).attach(
      addressList[network.name].PolicyCoreUpgradeable
    );

    let stablecoinAddress: string;
    if (network.name == "avax" || network.name == "avaxTest") {
      if (taskArgs.stablecoin == "shield") {
        stablecoinAddress = addressList[network.name].Shield;
      } else {
        stablecoinAddress = getTokenAddressOnAVAX(taskArgs.stablecoin);
      }
    } else stablecoinAddress = addressList[network.name].MockUSD;

    console.log("Stablecoin address: ", stablecoinAddress);

    const tx = await ILM.startILM(
      taskArgs.policytoken,
      stablecoinAddress,
      taskArgs.deadline
    );
    console.log("tx details:", await tx.wait());

    const pairInfo = await ILM.pairs(taskArgs.policytoken);
    const lptokenAddress = pairInfo.lptoken;

    const name = await core.findNamebyAddress(taskArgs.policytoken);
    console.log("policy token name: ", name);

    const newILMObject = {
      policyToken: taskArgs.policytoken,
      stablecoin: stablecoinAddress,
      deadline: taskArgs.deadline,
      lptoken: lptokenAddress,
    };
    ILMList[network.name][name] = newILMObject;

    storeILMList(ILMList);

    console.log("\n Finish Starting a new round ILM... \n");
  });

task("stopILM", "Stop a round ILM")
  .addParam("name", "Policy token name", null, types.string)
  .addParam("policytoken", "Policy token address", null, types.string)
  .addParam("deadline", "swap deadline", null, types.string)
  .setAction(async (taskArgs, hre) => {
    console.log("\n Stopping a new round ILM... \n");
    // Network info
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();
    const ILMList = readILMList();

    const ILM = new NaughtyPriceILM__factory(dev_account).attach(
      addressList[network.name].ILM
    );
    const core = new PolicyCore__factory(dev_account).attach(
      addressList[network.name].PolicyCoreUpgradeable
    );

    // Double check address
    const policyTokenAddress = await core.findAddressbyName(taskArgs.name);
    if (policyTokenAddress != taskArgs.policytoken) {
      console.log("Wrong address with toke name");
      return;
    }

    // Double check deadline
    const deadline = (await core.policyTokenInfoMapping(taskArgs.name))
      .deadline;
    if (deadline != taskArgs.deadline) {
      console.log("Wrong deadline");
      return;
    }

    // const tx = await ILM.finishILM(taskArgs.policytoken, taskArgs.deadline, 50);
    // console.log("tx details:", await tx.wait());

    const pairInfo = await ILM.pairs(taskArgs.policytoken);

    const pairAddress = pairInfo.naughtyPairAddress;
    console.log("Newly deployed naughty pair address: ", pairAddress);

    const name = await core.findNamebyAddress(taskArgs.policytoken);
    console.log("Policy token name: ", name);

    let ILMObject = ILMList[network.name][name];
    ILMObject.pairAddress = pairAddress;

    ILMList[network.name][name] = ILMObject;

    storeILMList(ILMList);

    console.log("\n Finish Stopping a round ILM... \n");
  });

task("approveStablecoin", "Approve stablecoin for ILM")
  .addParam("stablecoin", "Stablecoin address", null, types.string)
  .setAction(async (taskArgs, hre) => {
    console.log("\n Start Approving stablecoin in ILM... \n");
    // Network info
    const { network } = hre;

    // Signers
    const [dev_account] = await hre.ethers.getSigners();
    console.log("The default signer is: ", dev_account.address);

    const addressList = readAddressList();

    const ILM = new NaughtyPriceILM__factory(dev_account).attach(
      addressList[network.name].ILM
    );

    let stablecoinAddress: string;
    if (network.name == "avax" || network.name == "avaxTest") {
      if (taskArgs.stablecoin == "shield") {
        stablecoinAddress = addressList[network.name].Shield;
      } else {
        stablecoinAddress = getTokenAddressOnAVAX(taskArgs.stablecoin);
      }
    } else stablecoinAddress = addressList[network.name].MockUSD;

    console.log("Stablecoin address: ", stablecoinAddress);

    const tx = await ILM.approveStablecoin(stablecoinAddress);
    console.log("tx details:", await tx.wait());

    console.log("\n Finish Approving stablecoin in ILM... \n");
  });

// task("aaa", "Aaa").setAction(async (_, hre) => {
//   const list = [
//     // "0x1334aaa816af4d25d3dcff43a894ff864ecc3218",
//     // "0x25093b1b65ec8ffd1a1f5a97125e6df8ef3a745c",
//     // "0xf21764b9449b4910206c7d4f00cb18575c9431c2",
//     // "0xa233c3d855b52a4e9eeb844492eda0388b30cc56",
//     "0x79ca85430abca8b28cf6f6174eddb71c996f0834",
//     // "0x23807370b6544d9f4017be8b0c413682e443ecde",
//     // "0xf5082e4c4e2f60caa199cd7d104c6673875f9399",
//     // "0x4b2c33a54c164a31dfbe73d713fde40dc4c8a0a1",
//     "0xee6b9ce8c54587ee33d697dcd2d7e096790b5499",
//     // "0x88368603df5ddc48ef214980e69f5e457fed121b",
//     "0xea365673a749f853fb4c934821fa14e0020bb496",
//     // "0x457079c3c4dc777e8ca1d9bdbe6507a721b939b2",
//     // "0x989923d33be0612680064dc7223a9f292c89a538",
//     // "0xac17279f1da6974d6955df738445cccbdc95cbc5",
//     "0xfacd8ff899b7e794c2cd021cdcde8d7ef05e80a0",
//     "0x3673d51bf146810af96de840571c811e0f32853f",
//   ];

//   const rewardList = [
//     stablecoinToWei("488.88"),
//     stablecoinToWei("3.766"),
//     stablecoinToWei("968.89"),
//     stablecoinToWei("46086.84"),
//     stablecoinToWei("44.79"),
//   ];

//   // Network info
//   const { network } = hre;

//   // Signers
//   const [dev_account] = await hre.ethers.getSigners();
//   console.log("The default signer is: ", dev_account.address);

//   const addressList = readAddressList();
//   const policyCoreAddress = addressList[network.name].PolicyCoreUpgradeable;

//   const PolicyCore: PolicyCore__factory = await hre.ethers.getContractFactory(
//     "PolicyCore"
//   );
//   const core: PolicyCore = PolicyCore.attach(policyCoreAddress);

//   const ILM = new NaughtyPriceILM__factory(dev_account).attach(
//     addressList[network.name].ILM
//   );

//   let quota = [];

//   let sum: BigNumber = BigNumber.from(0);

//   const policyToken = "0x832054E67bB3e9eaBc09D7fa02888b5d42274aC2";

//   for (let i = 0; i < list.length; i++) {
//     const item = await core.getUserQuota(list[i], policyToken);

//     sum = sum.add(item);

//     quota.push(formatUnits(item, 6));

//     const userInfo = await ILM.users(list[i], policyToken);

//     console.log("------------------");
//     console.log("User address: ", list[i]);
//     console.log(
//       "User IM policy token amount: ",
//       formatUnits(userInfo.amountA, 6)
//     );
//     console.log("User IM usdc amount: ", formatUnits(userInfo.amountB, 6));
//     console.log("------------------");
//   }

//   const tx = await core.Depost(list, rewardList, policyToken);

//   for (let i = 0; i < list.length; i++) {
//     const item = await core.getUserQuota(list[i], policyToken);

//     sum = sum.add(item);

//     quota.push(formatUnits(item, 6));
//   }

//   console.log("sum:", formatUnits(sum, 6));

//   console.log("quota list", quota);

//   const pair = await ILM.pairs(policyToken);

//   console.log("IM Pair naughty token amount: ", formatUnits(pair.amountA, 6));
//   console.log("IM Pair usdc amount: ", formatUnits(pair.amountB, 6));
// });

// task("bbb", "bbb").setAction(async (_, hre) => {
//   const lists = [
//     "0x1334aaa816af4d25d3dcff43a894ff864ecc3218",
//     "0x25093b1b65ec8ffd1a1f5a97125e6df8ef3a745c",
//     "0xf21764b9449b4910206c7d4f00cb18575c9431c2",
//     "0xa233c3d855b52a4e9eeb844492eda0388b30cc56",
//     "0x79ca85430abca8b28cf6f6174eddb71c996f0834",
//     "0x23807370b6544d9f4017be8b0c413682e443ecde",
//     "0xf5082e4c4e2f60caa199cd7d104c6673875f9399",
//     "0x4b2c33a54c164a31dfbe73d713fde40dc4c8a0a1",
//     "0xee6b9ce8c54587ee33d697dcd2d7e096790b5499",
//     "0x88368603df5ddc48ef214980e69f5e457fed121b",
//     "0xea365673a749f853fb4c934821fa14e0020bb496",
//     "0x457079c3c4dc777e8ca1d9bdbe6507a721b939b2",
//     "0x989923d33be0612680064dc7223a9f292c89a538",
//     "0xac17279f1da6974d6955df738445cccbdc95cbc5",
//     "0xfacd8ff899b7e794c2cd021cdcde8d7ef05e80a0",
//     "0x3673d51bf146810af96de840571c811e0f32853f",
//   ];

//   // const list = [
//   //   "0xb221a0f172694ddbb7883c7fe37459cc25f0a406",
//   //   "0x457079c3c4dc777e8ca1d9bdbe6507a721b939b2",
//   //   "0x4b2c33a54c164a31dfbe73d713fde40dc4c8a0a1",
//   //   "0xf5082e4c4e2f60caa199cd7d104c6673875f9399",
//   //   "0xfacd8ff899b7e794c2cd021cdcde8d7ef05e80a0",
//   //   "0xf1376072ae0e2e114ce40a3b43609a46ea99d348",
//   //   "0xee6b9ce8c54587ee33d697dcd2d7e096790b5499",
//   //   "0x433fc40f13267eeecf18a5b4f170bcec4020910e",
//   //   "0xa233c3d855b52a4e9eeb844492eda0388b30cc56",
//   //   "0x5d8217548f1ae64f4278f1b395bc57c4bdc12f5c",
//   //   "0x124919c68e359b9016801f6dc4e34178ff0d195e",
//   //   "0xf21764b9449b4910206c7d4f00cb18575c9431c2",
//   //   "0xea365673a749f853fb4c934821fa14e0020bb496",
//   //   "0x25093b1b65ec8ffd1a1f5a97125e6df8ef3a745c",
//   //   "0x67fd0f34400f3edc485f5aeb2c8cc0e289041073",
//   //   "0x1be1a151ba3d24f594ee971dc9b843f23b5ba80e",
//   //   "0x23807370b6544d9f4017be8b0c413682e443ecde",
//   //   "0x79ca85430abca8b28cf6f6174eddb71c996f0834",
//   //   "0x7867c45936950759dee9eceacd349366eead636e",
//   //   "0x6b0125f1356c12fc4cee7e941e03a7bd5b4c8100",
//   //   "0x0d19d8404c2c7ab2f7f4a39fa242a7c8fac62f5a",
//   //   "0x4eb12553b8feeae8042356f1e43b7fc2b2852b2e",
//   //   "0x1334aaa816af4d25d3dcff43a894ff864ecc3218",
//   // ];

//   // Network info
//   const { network } = hre;

//   // Signers
//   const [dev_account] = await hre.ethers.getSigners();
//   console.log("The default signer is: ", dev_account.address);

//   const addressList = readAddressList();
//   const policyCoreAddress = addressList[network.name].PolicyCoreUpgradeable;

//   const PolicyCore: PolicyCore__factory = await hre.ethers.getContractFactory(
//     "PolicyCore"
//   );
//   const core: PolicyCore = PolicyCore.attach(policyCoreAddress);

//   let quota = [];

//   let chongfu = [];

//   // const tx = await core.Depost(
//   //   lists,
//   //   "0x832054E67bB3e9eaBc09D7fa02888b5d42274aC2"
//   // );
//   // console.log("tx details:", await tx.wait());

//   //   for (let i = 0; i < list.length; i++) {
//   //     if (lists.includes(list[i])) {
//   //       console.log(list[i]);
//   //       chongfu.push(list[i]);
//   //       continue;
//   //     }

//   //     const item = await core.getUserQuota(
//   //       list[i],
//   //       "0x832054E67bB3e9eaBc09D7fa02888b5d42274aC2"
//   //     );

//   //     quota.push(formatUnits(item, 6));
//   //   }

//   //   console.log(quota);
// });
