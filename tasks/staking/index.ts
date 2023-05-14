import { task } from "hardhat/config";

import { getStakingPoolAction } from "./getStakingPool";
import { setStakingRewardAction } from "./setStakingReward";
import { deployStakingPoolAction } from "./deployStakingPool";
import { stakeAction } from "./stake";
import { getUserStakingAction } from "./getUserStaking";

// DEG Address: 0x9f285507Ea5B4F33822CA7aBb5EC8953ce37A645

// hh getStakingPool --network arb --pooltoken 0x1234
task(
  "getStakingPool",
  "Get the staking pool address by its reward token",
  getStakingPoolAction
).addParam("pooltoken", "Address of the pool reward token");

// hh setStakingReward --network arb --pool 0x1234 --reward 0.1
task(
  "setStakingReward",
  "Set the degis reward of a staking pool",
  setStakingRewardAction
)
  .addParam("pool", "Address of the pool(not the reward token)")
  .addParam("reward", "Degis reward per second(no decimals, 1 = 1e18)");

// hh deployStakingPool --network arb --pooltoken 0x1234 --start 0 --reward 0.1
task("deployStakingPool", "Deploy a new staking pool", deployStakingPoolAction)
  .addParam("pooltoken", "Address of the pool's reward token")
  .addParam("start", "Staking pool start timestamp")
  .addParam("reward", "Degis reward per second(no decimals, 1 = 1e18)");

task("stake", "Stake in staking pool", stakeAction)
  .addParam("pooltoken", "Address of the pool's reward token")
  .addParam("amount", "Amount of pool token to stake(no decimals, 1 = 1e18)")
  .addParam("lockuntil", "Lock the stake until this timestamp");

task(
  "getUserStaking",
  "Get user staking info in a staking pool",
  getUserStakingAction
)
  .addParam("pooltoken", "Address of the pool's reward token")
  .addParam("address", "Address of the user");
