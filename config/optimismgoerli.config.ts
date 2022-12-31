
import { ethers } from "hardhat";
import {OptimismConfig} from "./configs";

export const config: OptimismConfig = {
    settings: {
        ChainId: 420,
        RpcEndpoint: "https://optimism-goerli.infura.io/v3/",
        GovernanceEnabled: false,
        uxpTotalSupply: "0",
        governorParams: {
            votingDelay: 50,
            votingPeriod: 300,
            proposalThreshold: ethers.utils.formatEther("1"),
            quorumFraction: 10
        }
    },
    tokens: {
        USDC: "0xe5e0DE0ABfEc2FFFaC167121E51d7D8f57C8D9bC",
        WETH: "0x4200000000000000000000000000000000000006"
    },
    addresses: {
        Deployer: "0x3382Bb7214c109f12Ffe8aA9C39BAf7eDB991427",
        TokenReceiver: "0x85e34812c32482394F123486c29eF3537A6d2401",
    },
    contracts: {
        PerpClearingHouse: "0xaD2663386fe55e920c81D55Fc342fC50F91D86Ca",
        PerpAccountBalance: "0xF59f28F21ad8905a7C797BeE2aeABccb53A5650a",
        PerpVault: "0x253D7430118Be0B961A5e938d003C6d690d7ce99",
        PerpMarketRegistry: "0xE3376C2067115c86020339BC6a3879B4778f5b15",
        PerpVETHMarket: "0x60A233b9b94c67e94e0a269429Fb40004D4BA494",
        UniSwapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564"
    },
    layerZero: {
        current: {
            chainId: "10132",
            endpoint: "0xae92d5aD7583AD66E49A0c67BAd18F6ba52dDDc1"
        },
        ethereum: {
            chainId: "10121",
            endpoint: "0xbfD2135BFfbb0B5378b56643c2Df8a87552Bfa23"
        },
        optimism: {
            chainId: "10132",
            endpoint: "0xae92d5aD7583AD66E49A0c67BAd18F6ba52dDDc1"
        },
        arbitrum: {
            chainId: "10143",
            endpoint: "0x6aB5Ae6822647046626e83ee6dB8187151E1d5ab"
        }
    }
}
