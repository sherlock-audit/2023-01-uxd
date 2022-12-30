import { ethers } from "hardhat";
import { UXDGovernor } from "../../typechain-types";
import { loadCoreContracts, loadCouncilGovernanceContracts, loadDepositoryImpl } from "../common/loaders";

async function main() {
    const hre = await import("hardhat");
    const core = await loadCoreContracts(hre);
    const governance = await loadCouncilGovernanceContracts(hre);
    const depositoryImpl = await loadDepositoryImpl(hre);

    const UXDGovernor = await ethers.getContractFactory("UXDGovernor");
    const governor: UXDGovernor = UXDGovernor.attach(governance.governor) as UXDGovernor;

    const PerpDepository = await ethers.getContractFactory("PerpDepository");
    const depository = PerpDepository.attach(core.controller);

    const newImplementation = depositoryImpl.depositoryImpl;
    const proposalDescription = `Proposal #5: Update depository implementation`;

    const upgradeCallData = depository.interface.encodeFunctionData(
        "upgradeTo", 
        [newImplementation]
    )

    console.log('proposing')
    const tx = await (await governor.propose(
        [depository.address], 
        [0], 
        [upgradeCallData,],
        proposalDescription,
    )).wait();
    console.log('governance tx = ', tx.transactionHash);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});