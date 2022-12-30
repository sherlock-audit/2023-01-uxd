import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { loadPublicGovernanceContracts, loadConfig } from "../scripts/common/loaders";
import { UXPToken } from "../typechain-types";

task("sendUxpCrossChain", "Sends UXP tokens cross chain")
.addParam("dstchain")
.addOptionalParam("to")
.addOptionalParam("amount", "amount to send in")
.setAction(async (taskArgs, hre) => {
    const sender = (await hre.ethers.getSigners())[0].address;
    const amount = taskArgs.amount || "1.0";
    const recipient = taskArgs.to || sender;
    await crossChainSend(taskArgs.dstchain, sender, recipient, amount, hre);
});

async function crossChainSend(dstChain: string, sender: string, recipient: string, amount: string, hre: HardhatRuntimeEnvironment) {
    const srcGovernance = await loadPublicGovernanceContracts(hre);
    const UXP = await hre.ethers.getContractFactory("UXPToken");
    const srcUxp: UXPToken = UXP.attach(srcGovernance.token) as UXPToken;
    
    const dstConfig = await loadConfig(hre, dstChain);
    const dstGovernance = await loadPublicGovernanceContracts(hre, dstChain);
    const amountWei = hre.ethers.utils.parseEther(amount);
    let adapterParams = hre.ethers.utils.solidityPack(["uint16", "uint256"], [1, 200000]) // default adapterParams example
    console.log("Estimating fees")
    const fees = await srcUxp.estimateSendFee(
        dstConfig.layerZero.current.chainId,
        recipient,
        amountWei,
        false,
        adapterParams
    );
    console.log(`estimatedFees = ${hre.ethers.utils.formatEther(fees[0])}`)
    const tx = await (await srcUxp.sendFrom(
        sender,
        dstConfig.layerZero.current.chainId,
        recipient,
        amountWei,
        sender, // refundAddress
        hre.ethers.constants.AddressZero,
        "0x",
        {value: fees[0]}
    )).wait()

    console.log(`send UXP on ${hre.network.name} [${dstConfig.layerZero.current.chainId}, ${dstGovernance.token}] tx = ${tx.transactionHash}`);
}
