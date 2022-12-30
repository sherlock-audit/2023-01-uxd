import { ethers } from "hardhat";
import {EthereumConfig} from "./configs";
export const config: EthereumConfig = {
    settings: {
        uxpTotalSupply: "7000000000",
        governorParams: {
            votingDelay: 50,
            votingPeriod: 300,
            proposalThreshold: ethers.utils.formatEther("1"),
            quorumFraction: 10
        }
    },
    tokens: {
        WETH: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
        USDC: "0x5FfbaC75EFc9547FBc822166feD19B05Cd5890bb"
    },
    layerZero: {
        current: {
            chainId: "10121",
            endpoint: "0xbfD2135BFfbb0B5378b56643c2Df8a87552Bfa23"
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