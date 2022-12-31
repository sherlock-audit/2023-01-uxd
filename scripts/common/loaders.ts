// import { network} from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ArbitrumConfig, EthereumConfig, OptimismConfig } from "../../config/configs";
import { ControllerImplContract, CoreContracts, DepositoryImplContract, GovernanceContracts, Depositories, PerpPeriphery, UXDTokenContract } from "../../config/contracts"
import { NetworkName } from "./checkNetwork";

export async function loadConfig(hre: HardhatRuntimeEnvironment, networkName: string = hre.network.name): Promise<OptimismConfig | ArbitrumConfig | EthereumConfig> {
    switch (networkName) {
        case NetworkName.Goerli:
            return (await import ("../../config/goerli.config")).config
        case NetworkName.OptimismGoerli:
            return (await import ("../../config/optimismgoerli.config")).config
        case NetworkName.ArbitrumGoerli:
            return (await import ("../../config/arbitrumgoerli.config")).config
        default:
            throw new Error("Unsupported network: " + hre.network.name)
    }
}

export async function loadCoreContracts(hre: HardhatRuntimeEnvironment, networkName: string = hre.network.name): Promise<CoreContracts> {
    switch (networkName) {
        case NetworkName.Goerli:
            return (await import("../../addresses/goerli/core.json")) as CoreContracts
        case NetworkName.OptimismGoerli:
            return (await import("../../addresses/optimismgoerli/core.json")) as CoreContracts
        case NetworkName.ArbitrumGoerli:
            return (await import("../../addresses/arbitrumgoerli/core.json")) as CoreContracts
        default:
            throw new Error("Unsupported network: " + hre.network.name)
    }
}

export async function loadCouncilGovernanceContracts(hre: HardhatRuntimeEnvironment, ): Promise<GovernanceContracts> {
    switch (hre.network.name) {
        // case NetworkName.Goerli:
            // return (await import ("../../config/goerli.config"))
        case NetworkName.OptimismGoerli:
            return (await import ("../../addresses/optimismgoerli/governance_council.json"))
        // case NetworkName.ArbitrumGoerli:
            // return (await import ("../../config/arbitrumgoerli.config"))
        default:
            throw new Error("Unsupported network: " + hre.network.name)
    }
}

export async function loadPublicGovernanceContracts(hre: HardhatRuntimeEnvironment, networkName: string = hre.network.name,): Promise<GovernanceContracts> {
    switch (networkName) {
        case NetworkName.Goerli:
            return (await import ("../../addresses/goerli/governance_public.json"))
        case NetworkName.OptimismGoerli:
            return (await import ("../../addresses/optimismgoerli/governance_public.json"))
        case NetworkName.ArbitrumGoerli:
            return (await import ("../../addresses/arbitrumgoerli/governance_public.json"))
        default:
            throw new Error("Unsupported network: " + hre.network.name)
    }
}
export async function loadDepositories(hre: HardhatRuntimeEnvironment, networkName: string = hre.network.name): Promise<Depositories> {
    switch (networkName) {
        case NetworkName.ArbitrumGoerli:
            return await import("../../addresses/arbitrumgoerli/depositories.json")
        case NetworkName.OptimismGoerli:
            return await import("../../addresses/optimismgoerli/depositories.json")
        default:
            throw new Error("Unsupported network: " + hre.network.name)
    }
}


export async function loadControllerImpl(hre: HardhatRuntimeEnvironment, ): Promise<ControllerImplContract> {
    switch (hre.network.name) {
        case NetworkName.ArbitrumGoerli:
            return await import("../../addresses/arbitrumgoerli/controller_impl.json")
        case NetworkName.OptimismGoerli:
            return await import("../../addresses/optimismgoerli/controller_impl.json")
        default:
            throw new Error("Unsupported network: " + hre.network.name)
    }
}

export async function loadDepositoryImpl(hre: HardhatRuntimeEnvironment, ): Promise<DepositoryImplContract> {
    switch (hre.network.name) {
        default:
            return await import("../../addresses/optimismgoerli/depository_impl.json")
    }
}

export async function loadPerpDepositoryImpl(hre: HardhatRuntimeEnvironment): Promise<DepositoryImplContract> {
    switch (hre.network.name) {
        default:
            return await import("../../addresses/optimismgoerli/perp_depository_impl.json")
    }
}

export async function loadRageDepositoryImpl(hre: HardhatRuntimeEnvironment): Promise<DepositoryImplContract> {
    switch (hre.network.name) {
        default:
            return await import("../../addresses/arbitrumgoerli/rage_depository_impl.json")
    }
}
export async function loadPerpPeriphery(hre: HardhatRuntimeEnvironment, ): Promise<PerpPeriphery> {
    switch (hre.network.name) {
        default:
            return await import("../../addresses/optimismgoerli/perpAccountProxy.json")
    }
}