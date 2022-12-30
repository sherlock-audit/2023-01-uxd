import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { loadConfig, loadCoreContracts } from "../scripts/common/loaders";
import { UXDToken } from "../typechain-types";

task("sendUxdCrossChain", "Sends UXD tokens cross chain")
.addParam("dstchain", "destination chain")
.addOptionalParam("to", "target address")
.addOptionalParam("amount", "amount to send in")
.setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const sender = (await hre.ethers.getSigners())[0].address;
    const amount = taskArgs.amount || "1.0";
    const recipient = taskArgs.to || sender;
    await crossChainSend(taskArgs.dstchain, sender, recipient, amount, hre);
});

async function crossChainSend(dstChain: string, sender: string, recipient: string, amount: string, hre: HardhatRuntimeEnvironment) {
    const srcGovernance = await loadCoreContracts(hre);
    const UXD = await hre.ethers.getContractFactory("UXDToken");
    const srcUxd: UXDToken = UXD.attach(srcGovernance.uxd) as UXDToken;
    
    const dstConfig = await loadConfig(hre, dstChain);
    const dstContracts = await loadCoreContracts(hre, dstChain);
    const amountWei = hre.ethers.utils.parseEther(amount);
    let adapterParams = hre.ethers.utils.solidityPack(["uint16", "uint256"], [1, 200000]) // default adapterParams example
    console.log("Estimating fees")
    const fees = await srcUxd.estimateSendFee(
        dstConfig.layerZero.current.chainId,
        recipient,
        amountWei,
        false,
        adapterParams
    );
    console.log(`estimatedFees = ${hre.ethers.utils.formatEther(fees[0])}`)
    const tx = await (await srcUxd.sendFrom(
        sender,
        dstConfig.layerZero.current.chainId,
        recipient,
        amountWei,
        sender, // refundAddress
        hre.ethers.constants.AddressZero,
        "0x",
        {value: fees[0]}
    )).wait()

    console.log(`send UXD on ${hre.network.name} [${dstConfig.layerZero.current.chainId}, ${dstContracts.uxd}] tx = ${tx.transactionHash}`);
}
