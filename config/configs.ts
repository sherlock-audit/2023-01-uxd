export interface LzPair {
    endpoint: string
    chainId: string
}

export interface LzConfig {
    current: LzPair
    ethereum: LzPair
    optimism: LzPair
    arbitrum: LzPair 
}

export interface GovernorParams {
    votingDelay: number,
    votingPeriod: number,
    proposalThreshold: string,
    quorumFraction: number
}

export interface EthereumConfig {
    settings: {
        uxpTotalSupply: string
        governorParams: GovernorParams
    },
    tokens: {
        WETH: string
        USDC: string
    }
    layerZero: LzConfig
}

export interface OptimismConfig {
    settings: {
        ChainId: number,
        RpcEndpoint: string,
        GovernanceEnabled: boolean
        uxpTotalSupply: string
        governorParams: GovernorParams
    },
    addresses: {
        Deployer: string,
        TokenReceiver: string,
    }
    tokens: {
        USDC: string,
        WETH: string
    },
    contracts: {
        PerpClearingHouse: string,
        PerpAccountBalance: string,
        PerpVault: string,
        PerpMarketRegistry: string,
        PerpVETHMarket: string,
        UniSwapRouter: string,
    },
    layerZero: LzConfig
}

export interface ArbitrumConfig {
    settings: {
        uxpTotalSupply: string
        governorParams: GovernorParams
    }
    addresses: {
        Deployer: string,
        TokenReceiver: string,
    }
    tokens: {
        USDC: string
        WETH: string
    },
    contracts: {
        RageGmxSeniorVault: string 
    },
    layerZero: LzConfig
}