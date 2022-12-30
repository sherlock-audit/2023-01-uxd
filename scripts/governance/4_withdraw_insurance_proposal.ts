import { ethers } from "hardhat";
import { UXDGovernor, PerpDepository } from "../../typechain-types";
import { loadCoreContracts, loadCouncilGovernanceContracts, loadDepositories } from "../common/loaders";

const usdcDecimals = 6;

async function main() {
    const hre = await import ("hardhat");
    let tx;
    const core = await loadCoreContracts(hre);
    const governance = await loadCouncilGovernanceContracts(hre)
    const depositories = await loadDepositories(hre);
    const PerpDepository = await ethers.getContractFactory("PerpDepository");
    const depository = PerpDepository.attach(depositories.perpetualProtocol!) as PerpDepository;

    const UXDGovernor = await ethers.getContractFactory("UXDGovernor");
    const governor = UXDGovernor.attach(governance.governor) as UXDGovernor;

    const amount = "100";
    const usdcAmount = ethers.utils.parseUnits(amount, usdcDecimals);
    const proposalDescription = `Proposal #9: Withdraw $${amount} from the insurance fund`;

    const withdrawInsuranceCallData = depository.interface.encodeFunctionData(
        "withdrawInsurance",
        [usdcAmount, governance.timelock]
    );

    console.log('withdrawInsuranceCallData = ', withdrawInsuranceCallData);

    console.log('proposing')
    tx = await (await governor.propose(
        [depository.address], 
        [0], 
        [withdrawInsuranceCallData],
        proposalDescription,
    )).wait();
    console.log('governance tx = ', tx.transactionHash)
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});