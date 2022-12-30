import { ethers } from "hardhat";
import { ArbitrumConfig } from "./configs";

export const config: ArbitrumConfig = {
    settings: {
        uxpTotalSupply: "0",
        governorParams: {
            votingDelay: 160,
            votingPeriod: 1500,
            proposalThreshold: ethers.utils.formatEther("1"),
            quorumFraction: 10
        }
    },
    contracts: {
        RageGmxSeniorVault: "0x24bDC1038997F638E6447CBA68039984B958774c"
    },
    addresses: {
        Deployer: "0x3382Bb7214c109f12Ffe8aA9C39BAf7eDB991427",
        TokenReceiver: "0x85e34812c32482394F123486c29eF3537A6d2401",
    },
    tokens: {
        USDC: "0x6775842AE82BF2F0f987b10526768Ad89d79536E",
        WETH: "0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3"
    },
    layerZero: {
        current: {
            chainId: "10143",
            endpoint: "0x6aB5Ae6822647046626e83ee6dB8187151E1d5ab"
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
