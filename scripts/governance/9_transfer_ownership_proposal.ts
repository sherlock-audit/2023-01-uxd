import { ethers } from "hardhat";
import { UXDController, UXDGovernor } from "../../typechain-types";
import { loadCoreContracts, loadCouncilGovernanceContracts, loadPublicGovernanceContracts } from "../common/loaders";

async function main() {
    const hre = await import("hardhat");
    const councilGovernance = await loadCouncilGovernanceContracts(hre);
    const publicGovernance = await loadPublicGovernanceContracts(hre);
    const core = await loadCoreContracts(hre);

    const UXDGovernor = await ethers.getContractFactory("UXDGovernor");
    const governor = UXDGovernor.attach(councilGovernance.governor) as UXDGovernor;

    const UXDController = await ethers.getContractFactory("UXDController");
    const controller = UXDController.attach(core.controller) as UXDController;

    const proposalDescription = `Proposal #4: Transfer controller ownership to timelock`;

    const controllerCallData = controller.interface.encodeFunctionData(
        "transferOwnership",
        [publicGovernance.timelock]
    );

    console.log('proposing')
    const tx = await (await governor.propose(
        [controller.address], 
        [0], 
        [controllerCallData],
        proposalDescription,
    )).wait();
    console.log('transfer ownership proposal tx = ', tx.transactionHash)
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});