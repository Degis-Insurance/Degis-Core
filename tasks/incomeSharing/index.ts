import { task } from "hardhat/config";

import { depositIncomeSharingAction } from "./deposit";
import { convertIncomeAction } from "./convertIncome";
import { startIncomeSharingPoolAction } from "./startPool";

task("depositIncomeSharing", depositIncomeSharingAction)
  .addParam("id", "The id of the income sharing pool")
  .addParam("amount", "Amount of deg to deposit(no decimals, 1 = 1e18)");

task(
  "convertIncome",
  "Convert income in income maker",
  convertIncomeAction
).addParam("token", "Policy token address");

task("startIncomeSharingPool", startIncomeSharingPoolAction).addParam(
  "token",
  "The pool reward token"
);
