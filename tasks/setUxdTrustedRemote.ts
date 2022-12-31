import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { loadConfig, loadCoreContracts } from "../scripts/common/loaders";
import { UXDToken } from "../typechain-types";

task("setUxdTrustedRemote", "Sets trusted remote contracts on UXD")
.addParam("dstchain")
.setAction(async (taskArgs, hre) => {
    await setTrustedRemotes(taskArgs.dstchain, hre);
});

async function setTrustedRemotes(dst: string, hre: HardhatRuntimeEnvironment) {
    const srcCoreContracts = await loadCoreContracts(hre);
    const UXD = await hre.ethers.getContractFactory("UXDToken");
    const srcUxd: UXDToken = UXD.attach(srcCoreContracts.uxd) as UXDToken;
    
    const dstConfig = await loadConfig(hre, dst);
    const dstCoreContracts = await loadCoreContracts(hre, dst);

    console.log("Setting trusted remote")
    const tx = await (await srcUxd.setTrustedRemoteAddress(
        dstConfig.layerZero.current.chainId, 
        dstCoreContracts.uxd)
    ).wait();
    console.log(`setTrustedRemote UXD on ${hre.network.name} [${dstConfig.layerZero.current.chainId}, ${dstCoreContracts.uxd}] tx = ${tx.transactionHash}`);
}
