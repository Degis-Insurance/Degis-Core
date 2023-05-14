import { task } from "hardhat/config";

import { addFarmingPoolAction } from "./addFarmingPool";
import { setFarmingRewardAction } from "./setFarmingReward";
import { setFarmingStartTimeAction } from "./setFarmingStartTime";
import { addDoubleRewardTokenAction } from "./addDoubleRewardToken";

// hh addFarmingPool --network avax --name ProctectionPool --address 0x6D260Abb832E019F72De686cD67CA704b15F4D57 --reward 0.01157 --bonus 0 --doublereward 0
task("addFarmingPool", "Add new farming pool", addFarmingPoolAction)
  .addParam("name", "The name of the new farming pool")
  .addParam("address", "The pool's address to be added")
  .addParam("reward", "Initial degis reward per second")
  .addParam("bonus", "Bonus degis reward per second")
  .addParam("doublereward", "Double reward token address");

task(
  "setFarmingReward",
  "Set the degis reward of a farming pool",
  setFarmingRewardAction
)
  .addParam("id", "Pool id")
  .addParam("reward", "Basic Degis reward per second")
  .addParam("bonus", "Bonus reward per second");

task(
  "setFarmingStartTime",
  "Set the start timestamp of farming",
  setFarmingStartTimeAction
).addParam("start", "The start timestamp");

task(
  "addDoubleRewardToken",
  "Add double reward to a farming pool",
  addDoubleRewardTokenAction
)
  .addParam("lptoken", "LPToken address")
  .addParam("rewardtoken", "Reward token address");
