import { task } from "hardhat/config";

import { depositVeDEGAction } from "./depositVeDEG";
import { withdrawVeDEGAction } from "./withdrawVeDEG";
import { claimVeDEGAction } from "./claimVeDEG";
import { setGenerationRateAction } from "./setGenerationRate";
import { addWhiteListAction } from "./addWhiteList";
import { removeWhiteListAction } from "./removeWhiteList";

task(
  "depositVeDEG",
  "Deposit deg token into veDEG",
  depositVeDEGAction
).addParam("amount", "Amount of deg to deposit(no decimals, 1 = 1e18)");

task(
  "withdrawVeDEG",
  "Withdraw deg token into veDEG",
  withdrawVeDEGAction
).addParam("amount", "Amount of deg to deposit(no decimals, 1 = 1e18)");

task("claimVeDEG", "Cliam veDEG reward", claimVeDEGAction);

task(
  "setGenerationRate",
  "Set the generation rate of veDEG",
  setGenerationRateAction
).addParam("rate", "The generation rate");

task("addWhiteList", "Add whitelist for veDEG", addWhiteListAction).addParam(
  "address",
  "The address to add"
);

task(
  "removeWhiteList",
  "Remove whitelist from veDEG",
  removeWhiteListAction
).addParam("address", "The address to remove");
