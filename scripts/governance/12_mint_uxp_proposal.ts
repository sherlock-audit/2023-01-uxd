import { ethers } from "hardhat";
import { UXDGovernor, UXPToken } from "../../typechain-types";
import { loadPublicGovernanceContracts } from "../common/loaders";


async function main() {
    const hre = await import("hardhat")
    const publicGovernance = await loadPublicGovernanceContracts(hre);
    const UXPToken = await ethers.getContractFactory("UXPToken");
    const uxpToken: UXPToken = UXPToken.attach(publicGovernance.token) as UXPToken;

    const UXDGovernor = await ethers.getContractFactory("UXDGovernor");
    const governor: UXDGovernor = UXDGovernor.attach(publicGovernance.governor) as UXDGovernor;

    const tokenRecipient = "0x9fEcc73Da3f8bd2aC436547a72f8Dd32326D90dc";
    const amount = ethers.utils.parseEther("1000")
    const mintCallData = uxpToken.interface.encodeFunctionData(
        "mint", 
        [tokenRecipient, amount]
    );
    const proposalDescription = `Proposal #2: Mint UXP tokens`;

    console.log('proposing')
    const contract = uxpToken.address
    const tx = await (await governor.propose(
        [contract],
        [0], 
        [mintCallData],
        proposalDescription,
    )).wait();
    console.log('publicGovernance tx = ', tx.transactionHash)
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
