import { task } from "hardhat/config";

import { depositEmergencyPoolAction } from "./deposit";
import { withdrawEmergencyPoolAction } from "./withdraw";

task(
  "depositEmergencyPool",
  "deposit funds into emergency pool",
  depositEmergencyPoolAction
)
  .addParam("address")
  .addParam("amount");

task(
  "withdrawEmergencyPool",
  "withdraw funds from emergency pool",
  withdrawEmergencyPoolAction
).addParam("address");
