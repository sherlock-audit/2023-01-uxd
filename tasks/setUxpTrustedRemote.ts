import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { loadPublicGovernanceContracts, loadConfig } from "../scripts/common/loaders";
import { UXPToken } from "../typechain-types";

task("setUxpTrustedRemote", "Sets trusted remote contracts on UXP")
.addParam("dstchain")
.setAction(async (taskArgs, hre) => {
    await setTrustedRemotes(taskArgs.dstchain, hre);
});

async function setTrustedRemotes(dst: string, hre: HardhatRuntimeEnvironment) {
    const srcGovernance = await loadPublicGovernanceContracts(hre);
    const UXP = await hre.ethers.getContractFactory("UXPToken");
    const srcUxp: UXPToken = UXP.attach(srcGovernance.token) as UXPToken;
    
    const dstConfig = await loadConfig(hre, dst);
    const dstGovernance = await loadPublicGovernanceContracts(hre, dst);

    console.log("Setting trusted remote")
    const tx = await (await srcUxp.setTrustedRemoteAddress(
        dstConfig.layerZero.current.chainId, 
        dstGovernance.token)
    ).wait();
    console.log(`setTrustedRemote UXP on ${hre.network.name} [${dstConfig.layerZero.current.chainId}, ${dstGovernance.token}] tx = ${tx.transactionHash}`);
}
