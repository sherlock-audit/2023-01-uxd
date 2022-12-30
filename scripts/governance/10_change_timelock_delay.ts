import { ethers } from "hardhat";
import { UXDGovernor, UXDTimelockController } from "../../typechain-types";
import { loadCouncilGovernanceContracts } from "../common/loaders";

async function main() {
    let tx;
    const hre = await import("hardhat");
    const governance = await loadCouncilGovernanceContracts(hre);
    const UXDTimelock = await ethers.getContractFactory("UXDTimelockController");
    const timelock = UXDTimelock.attach(governance.timelock) as UXDTimelockController;

    const UXDGovernor = await ethers.getContractFactory("UXDGovernor");
    const governor = UXDGovernor.attach(governance.governor) as UXDGovernor;

    const proposalDescription = `Proposal #3: Update timelock delay`;
    const callData = timelock.interface.encodeFunctionData(
        "updateDelay",
        [180] // seconds
    );

    console.log('callData = ', callData);

    console.log('proposing')
    tx = await (await governor.propose(
        [timelock.address], 
        [0], 
        [callData],
        proposalDescription,
    )).wait();
    console.log('governance tx = ', tx.transactionHash)
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
