import { ethers } from "hardhat";
import { UXDGovernor, UXDTimelockController } from "../../typechain-types";
import { loadCouncilGovernanceContracts } from "../common/loaders";

async function main() {
    const hre = await import("hardhat");
    const governance = await loadCouncilGovernanceContracts(hre);
    const UXDGovernor = await ethers.getContractFactory("UXDGovernor");
    const governor = UXDGovernor.attach(governance.governor) as UXDGovernor;

    const UXDTimelock = await ethers.getContractFactory("UXDTimelockController");
    const timelock = UXDTimelock.attach(governance.timelock) as UXDTimelockController;

    const proposalDescription = `Proposal #8: Transfer ETH`;
    const recipient = "0x3382Bb7214c109f12Ffe8aA9C39BAf7eDB991427";
    const ethAmount = ethers.utils.parseEther("0.1");
    const transferCallData = timelock.interface.encodeFunctionData(
        "transferETH", 
        [recipient, ethAmount]
    );

    console.log('proposing')
    const tx = await (await governor.propose(
        [timelock.address], 
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