import { ethers } from "hardhat";
import { UXDGovernor, UXDTimelockController, PerpDepository } from "../../typechain-types";
import { loadConfig, loadCouncilGovernanceContracts, loadDepositories } from "../common/loaders";

async function main() {
    const hre = await import ("hardhat")
    const config = await loadConfig(hre);
    const governance = await loadCouncilGovernanceContracts(hre);
    const depositories = await loadDepositories(hre);
    
    const usdcDecimals = 6;

    let tx;
    const Depository = await ethers.getContractFactory("PerpDepository");
    const depository: PerpDepository = Depository.attach(depositories.perpetualProtocol!) as PerpDepository;

    const UXDGovernor = await ethers.getContractFactory("UXDGovernor");
    const governor: UXDGovernor = UXDGovernor.attach(governance.governor) as UXDGovernor;

    const UXDTimelock = await ethers.getContractFactory("UXDTimelockController");
    const timelock: UXDTimelockController = UXDTimelock.attach(governance.timelock) as UXDTimelockController;

    const amount = "100";
    const spender = depository.address;
    const usdcAmount = ethers.utils.parseUnits(amount, usdcDecimals);
    const proposalDescription = `Deposit $${amount} to the insurance fund`;

    const approveCallData = timelock.interface.encodeFunctionData(
        "approveERC20",
        [config.tokens.USDC, spender, usdcAmount]
    );
    
    const transferCallData = depository.interface.encodeFunctionData(
        "depositInsurance",
        [usdcAmount, timelock.address]
    );

    console.log('transferCallData = ', transferCallData);

    console.log('proposing')
    tx = await (await governor.propose(
        [timelock.address, depository.address], 
        [0, 0], 
        [approveCallData, transferCallData],
        proposalDescription,
    )).wait();
    console.log('governance tx = ', tx.transactionHash)
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
