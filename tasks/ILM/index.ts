import { task } from "hardhat/config";

import { startILMAction } from "./startILM";
import { stopILMAction } from "./stopILM";
import { approveStablecoinAction } from "./approveStablecoin";
import { emergencyStopAction } from "./emergencyStop";

task("startILM", "Start a new round ILM", startILMAction)
  .addParam("policytoken", "Policy token address")
  .addParam("stablecoin", "Stablecoin address")
  .addParam("deadline", "ILM deadline");

task("stopILM", "Stop a round ILM", stopILMAction)
  .addParam("name", "Policy token name")
  .addParam("policytoken", "Policy token address")
  .addParam("deadline", "swap deadline");

task(
  "approveStablecoin",
  "Approve stablecoin in ILM",
  approveStablecoinAction
).addParam("stablecoin", "Stablecoin address to approve");

task("emergencyStop", "Emergency stop a ILM", emergencyStopAction).addParam(
  "policytoken",
  "Policy token address"
);
