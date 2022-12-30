import { ethers } from "hardhat";
import { UXDGovernor } from "../../typechain-types";
import { loadCouncilGovernanceContracts } from "../common/loaders";

async function main() {
    const hre = await import ("hardhat")
    const governance = await loadCouncilGovernanceContracts(hre);
    const UXDGovernor = await ethers.getContractFactory("UXDGovernor");
    const governor = UXDGovernor.attach(governance.governor) as UXDGovernor;

    const proposalDescription = `Proposal #2: Adjust voting delay and period`;

    const votingDelayCallData = governor.interface.encodeFunctionData(
        "setVotingDelay", 
        ["25"]
    );
    const votingPeriodCallData = governor.interface.encodeFunctionData(
        "setVotingPeriod", 
        ["300"]
    );

    const proposalThresholdCallData = governor.interface.encodeFunctionData(
        "setProposalThreshold",
        [ethers.utils.parseEther("1").toString()]
    )

    console.log('proposing')
    const tx = await governor.propose(
        [governor.address, governor.address, governor.address], 
        [0, 0, 0], 
        [votingDelayCallData, votingPeriodCallData, proposalThresholdCallData],
        proposalDescription,
    );
    await tx.wait();
    console.log('governance tx = ', tx)
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});