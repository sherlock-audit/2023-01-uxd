import { ethers } from "hardhat";
import { UXDGovernor, UXDController } from "../../typechain-types";
import { loadCoreContracts, loadCouncilGovernanceContracts } from "../common/loaders";

async function main() {
    let tx;
    const hre = await import("hardhat")
    const core = await loadCoreContracts(hre);
    const governance = await loadCouncilGovernanceContracts(hre);
    const UXDController = await ethers.getContractFactory("UXDController");
    const controller = UXDController.attach(core.controller) as UXDController;

    const UXDGovernor = await ethers.getContractFactory("UXDGovernor");
    const governor = UXDGovernor.attach(governance.governor) as UXDGovernor;

    const proposalDescription = `Proposal #14: Update router to ${core.router}`;
    const callData = controller.interface.encodeFunctionData(
        "updateRouter",
        [core.router]
    );

    console.log('callData = ', callData);

    console.log('proposing')
    tx = await (await governor.propose(
        [controller.address], 
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