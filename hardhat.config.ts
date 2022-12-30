import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@openzeppelin/hardhat-upgrades";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@nomiclabs/hardhat-solhint";
import "hardhat-contract-sizer";
import "@tenderly/hardhat-tenderly";
import "./tasks"

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
    compilers: [
      {
        version: "0.8.9",
        settings: {
          optimizer: {
            enabled: true,
            runs: 2000,
          },
        },
      },
      {
        version: "0.8.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 2000,
          },
        },
      },
    ],
  },
  networks: {
    localhost: {
      url: "http://localhost:8545",
      accounts: [
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
        "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
      ],
      chainId: 31337,
      gas: 8500000,
      gasPrice: 1000000000000,
      blockGasLimit: 124500000,
    },
    optimismgoerli: {
      url: `https://optimism-goerli.infura.io/v3/${process.env.INFURA_KEY}`,
      chainId: 420,
      accounts:
        process.env.PRIVATE_KEY !== undefined &&
        process.env.PRIVATE_KEY2 !== undefined
          ? [process.env.PRIVATE_KEY, process.env.PRIVATE_KEY2]
          : [],
      gas: 8500000,
      gasPrice: 12000,
    },
    optimism: {
      url: `https://opt-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
      chainId: 10,
      accounts:
        process.env.PRIVATE_KEY !== undefined &&
        process.env.PRIVATE_KEY2 !== undefined
          ? [process.env.PRIVATE_KEY, process.env.PRIVATE_KEY2]
          : [],
      gas: 8500000,
      gasPrice: 12000,
    },
    arbitrumgoerli: {
      url: `https://arbitrum-goerli.infura.io/v3/${process.env.INFURA_KEY}`,
      chainId: 421613,
      accounts:
        process.env.PRIVATE_KEY !== undefined &&
        process.env.PRIVATE_KEY2 !== undefined
          ? [process.env.PRIVATE_KEY, process.env.PRIVATE_KEY2]
          : [],
      gas: 8500000,
      gasPrice: 110000000,
    },
    arbitrumone: {
      url: `https://arbitrum-mainnet.infura.io/v3/${process.env.INFURA_KEY}`,
      chainId: 42161,
      accounts:
        process.env.PRIVATE_KEY !== undefined &&
        process.env.PRIVATE_KEY2 !== undefined
          ? [process.env.PRIVATE_KEY, process.env.PRIVATE_KEY2]
          : [],
      gas: 8500000,
      gasPrice: 110000000,
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`,
      chainId: 5,
      accounts:
        process.env.PRIVATE_KEY !== undefined &&
        process.env.PRIVATE_KEY2 !== undefined
          ? [process.env.PRIVATE_KEY, process.env.PRIVATE_KEY2]
          : [],
      gas: 18500000,
      gasPrice: 15100000000,
    },
    ethereum: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`,
      chainId: 1,
      accounts:
        process.env.PRIVATE_KEY !== undefined &&
        process.env.PRIVATE_KEY2 !== undefined
          ? [process.env.PRIVATE_KEY, process.env.PRIVATE_KEY2]
          : [],
      gas: 8500000,
      gasPrice: 32000000000,
    }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: {
      goerli: process.env.ETHERSCAN_ETHEREUM_KEY!,
      arbitrumGoerli: process.env.ETHERSCAN_ARBITRUM_KEY!,
      optimisticGoerli: process.env.ETHERSCAN_OPTIMISM_KEY!,
      mainnet: process.env.ETHERSCAN_ETHEREUM_KEY!,
      arbitrumOne: process.env.ETHERSCAN_ARBITRUM_KEY!,
      optimisticEthereum: process.env.ETHERSCAN_OPTIMISM_KEY!,
    }
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: false,
    strict: true,
  },
};

export default config;
