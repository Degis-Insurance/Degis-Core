import { task } from "hardhat/config";

import { pauseAction } from "./pause";
import { unpauseAction } from "./unpause";
import { upgradeAction } from "./upgrade";
import { getImplAction } from "./getImpl";

// hh pause --network arb --contract DegisToken
task("pause", "Pause a contract", pauseAction).addParam(
  "contract",
  "The contract name"
);

// hh unpause --network arb --contract DegisToken
task("unpause", "UnPause a contract", unpauseAction).addParam(
  "contract",
  "The contract name"
);

// hh upgrade --network arb --proxy 0x1234 --impl 0x1234
task("upgrade", "Upgrade an implementation", upgradeAction)
  .addParam("proxy", "The proxy address")
  .addParam("impl", "The new implementation address");

// hh getImpl --network arb --proxy 0x1234
task("getImpl", "Get an implementation", getImplAction).addParam(
  "proxy",
  "The proxy address"
);
