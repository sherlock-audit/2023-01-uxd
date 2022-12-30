import { ethers } from "hardhat";
import { UXDGovernor, UXDController, PerpDepository, UXDTimelockController } from "../../typechain-types";
import { loadConfig, loadCoreContracts, loadCouncilGovernanceContracts, loadDepositories } from "../common/loaders";

async function main() {
    const hre = await import("hardhat");
    const config = await loadConfig(hre);
    const governance = await loadCouncilGovernanceContracts(hre);
    const core = await loadCoreContracts(hre);
    const depositories = await loadDepositories(hre);
    const usdcDecimals = 6;

    const UXDController = await ethers.getContractFactory("UXDController");
    const controller = UXDController.attach(core.controller) as UXDController;

    const PerpDepository = await ethers.getContractFactory("PerpDepository");
    const depository = PerpDepository.attach(depositories.perpetualProtocol!) as PerpDepository;

    const UXDGovernor = await ethers.getContractFactory("UXDGovernor");
    const governor = UXDGovernor.attach(governance.governor) as UXDGovernor;

    const UXDTimelock = await ethers.getContractFactory("UXDTimelockController");
    const timelock = UXDTimelock.attach(governance.timelock) as UXDTimelockController;

    const amount = "100";
    const spender = controller.address;
    const usdcAmount = ethers.utils.parseUnits(amount, usdcDecimals);
    const proposalDescription = `Proposal #1: Deposit $${amount} to the insurance fund`;
    const descriptionHash = ethers.utils.id(proposalDescription);

    const approveCallData = timelock.interface.encodeFunctionData(
        "approveERC20",
        [config.tokens.USDC, spender, usdcAmount]
    );
    
    const transferCallData = depository.interface.encodeFunctionData(
        "depositInsurance",
        [usdcAmount, timelock.address]
    );

    console.log("About to execute proposal...")
    const tx = await (await governor.execute(
        [timelock.address, depository.address],
        [0, 0],
        [approveCallData, transferCallData],
        descriptionHash,
      )).wait();
    console.log("Execute tx = ", tx);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
