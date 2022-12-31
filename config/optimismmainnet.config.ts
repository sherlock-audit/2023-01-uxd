
import { ethers } from "ethers";
import {OptimismConfig} from "./configs";

export const config: OptimismConfig = {
    settings: {
        ChainId: 10,
        RpcEndpoint: "https://opt-mainnet.g.alchemy.com/v2/",
        GovernanceEnabled: true,
        uxpTotalSupply: "0",
        governorParams: {
            votingDelay: 50,
            votingPeriod: 300,
            proposalThreshold: ethers.utils.formatEther("1"),
            quorumFraction: 10
        }
    },
    addresses: {
        Deployer: "0x3382Bb7214c109f12Ffe8aA9C39BAf7eDB991427",
        TokenReceiver: "0x85e34812c32482394F123486c29eF3537A6d2401",
    },
    tokens: {
        USDC: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
        WETH: "0x4200000000000000000000000000000000000006"
    },
    contracts: {
        PerpClearingHouse: "0x82ac2CE43e33683c58BE4cDc40975E73aA50f459",
        PerpAccountBalance: "0xA7f3FC32043757039d5e13d790EE43edBcBa8b7c",
        PerpVault: "0xAD7b4C162707E0B2b5f6fdDbD3f8538A5fbA0d60",
        PerpMarketRegistry: "0xd5820eE0F55205f6cdE8BB0647072143b3060067",
        PerpVETHMarket: "0x36B18618c4131D8564A714fb6b4D2B1EdADc0042",
        UniSwapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564"
    },
    layerZero: {
        current: {
            chainId: "111",
            endpoint: "0x3c2269811836af69497E5F486A85D7316753cf62"
        },
        ethereum: {
            chainId: "101",
            endpoint: "0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675"
        },
        optimism: {
            chainId: "111",
            endpoint: "0x3c2269811836af69497E5F486A85D7316753cf62"
        },
        arbitrum: {
            chainId: "110",
            endpoint: "0x3c2269811836af69497E5F486A85D7316753cf62"
        }
    }
}
