import { ethers } from "hardhat";
import { UXDGovernor, UXDTimelockController } from "../../typechain-types";
import { loadConfig, loadCouncilGovernanceContracts } from "../common/loaders";

async function main() {
    const hre = await import ("hardhat");
    const config = await loadConfig(hre);
    const governance = await loadCouncilGovernanceContracts(hre);
    const UXDGovernor = await ethers.getContractFactory("UXDGovernor");
    const governor = UXDGovernor.attach(governance.governor) as UXDGovernor;

    const UXDTimelock = await ethers.getContractFactory("UXDTimelockController");
    const timelock = UXDTimelock.attach(governance.timelock) as UXDTimelockController;

    const proposalDescription = `Proposal #16: Transfer ETH`;
    const tokenAddress = config.tokens.USDC;
    const recipient = "0x3382Bb7214c109f12Ffe8aA9C39BAf7eDB991427";
    const amount = ethers.utils.parseEther("100");
    const transferCallData = timelock.interface.encodeFunctionData(
        "transferERC20", 
        [tokenAddress, recipient, amount]
    );

    console.log('proposing')
    const tx = await (await governor.propose(
        [governor.address], 
        [0], 
        [transferCallData],
        proposalDescription,
    )).wait();
    console.log('governance tx = ', tx.transactionHash)
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});