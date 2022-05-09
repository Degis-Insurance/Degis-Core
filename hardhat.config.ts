import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "hardhat-deploy";
import "hardhat-docgen";
import "hardhat-abi-exporter";
import "hardhat-contract-sizer";

// tasks;
import "./tasks/clearRecord";

import "./tasks/emergencyPool/deposit-withdraw";

// Farming Tasks
import "./tasks/farming/farmingPool";
import "./tasks/farming/purchaseIncentive";

// Miserable Flight Tasks
import "./tasks/misrableFlight/sigManager";
import "./tasks/misrableFlight/setAddress";
import "./tasks/misrableFlight/policyFlow";
import "./tasks/misrableFlight/insurancePool";
import "./tasks/misrableFlight/flightOracle";

// Naughty Price Tasks
import "./tasks/naughtyPrice/setAddress";
import "./tasks/naughtyPrice/settleResult";
import "./tasks/naughtyPrice/deployToken";
import "./tasks/naughtyPrice/deployPool";
import "./tasks/naughtyPrice/addStablecoin";

// Lucky Box Tasks
import "./tasks/lucky/setAddress";
import "./tasks/lucky/degisLottery";

// Token Tasks
import "./tasks/tokens/addMinterBurner";
import "./tasks/tokens/mintToken";

// Staking Tasks
import "./tasks/staking/stakingPoolFactory";

import "./tasks/proxy/admin";
import "./tasks/governance/VeDEG";

// Income Sharing tasks
import "./tasks/incomeSharing/setAddress";
import "./tasks/incomeSharing/pool";
import "./tasks/incomeSharing/incomeMaker";
import "./tasks/general/index";
import "./tasks/ILM/startStop";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.13",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
        details: {
          yul: true,
          yulDetails: {
            stackAllocation: true,
            optimizerSteps: "dhfoDgvulfnTUtnIf",
          },
        },
      },
    },
  },

  namedAccounts: {
    deployer: {
      default: 0,
      localhost: 0,
      rinkeby: "0x32eB34d060c12aD0491d260c436d30e5fB13a8Cd",
      fuji: 0,
      avax: 0,
      avaxTest: 0,
    },
    testAddress: {
      default: 1,
      localhost: 1,
      fuji: 1,
      avax: 1,
      avaxTest: 1,
    },
  },

  networks: {
    hardhat: {
      // forking: {
      //   url: "https://eth-mainnet.alchemyapi.io/v2/bWpjNreAv-0V7abTFwp_FTDoFYAl9JGt",
      // },
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    rinkeby: {
      url: process.env.RINKEBY_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    fuji: {
      url: process.env.FUJI_URL || "",
      accounts: {
        mnemonic:
          process.env.PHRASE_FUJI !== undefined ? process.env.PHRASE_FUJI : "",
        count: 20,
      },
      timeout: 60000,
    },
    avax: {
      url: process.env.AVAX_URL || "",
      accounts: {
        mnemonic:
          process.env.PHRASE_AVAX !== undefined ? process.env.PHRASE_AVAX : "",
        count: 20,
      },
      // gasPrice: 120000000000,
    },
    avaxTest: {
      url: process.env.AVAX_URL || "",
      accounts: {
        mnemonic:
          process.env.PHRASE_FUJI !== undefined ? process.env.PHRASE_FUJI : "",
        count: 20,
      },
      // gasPrice: 45000000000,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP,
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  docgen: {
    path: "./docs/hardhat-docgen",
    clear: true,
    runOnCompile: true,
  },
  abiExporter: {
    path: "./abi",
    runOnCompile: false,
    clear: true,
    flat: true,
    spacing: 2,
    pretty: true,
  },

  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: false,
    only: [],
  },
};

export default config;
