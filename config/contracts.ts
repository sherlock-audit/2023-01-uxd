export interface CoreContracts {
    controller: string
    router: string
    uxd: string
}

export interface Depositories {
    perpetualProtocol?: string
    rageTrade?: string
}

export interface Depositories {
    perpetualProtocol?: string;
    rageTrade?: string
}

export interface GovernanceContracts {
    timelock: string
    governor: string
    token: string
}

export interface UXDTokenContract {
    token: string
}

export interface ControllerImplContract {
    controllerImpl: string
}

export interface DepositoryImplContract {
    depositoryImpl: string
}

export interface PerpPeriphery {
    accountProxy: string;
}