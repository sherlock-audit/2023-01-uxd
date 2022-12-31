import { ethers } from "hardhat";
import { UXDGovernor, UXDCouncilToken } from "../../typechain-types";
import { loadCouncilGovernanceContracts } from "../common/loaders";


async function main() {
    const hre = await import ("hardhat");
    const governance = await loadCouncilGovernanceContracts(hre);
    const UXDCouncilToken = await ethers.getContractFactory("UXDCouncilToken");
    const councilToken = UXDCouncilToken.attach(governance.token) as UXDCouncilToken;

    const UXDGovernor = await ethers.getContractFactory("UXDGovernor");
    const governor = UXDGovernor.attach(governance.governor) as UXDGovernor;

    const tokenRecipient1 = "0x9fEcc73Da3f8bd2aC436547a72f8Dd32326D90dc";
    const tokenRecipient2 = "0x7f5270Ad1cdabe907139585DA180A560fafc7024";
    const tokenRecipient3 = "0x66Fa909096a04aA435e0FD1FA4b44b54CC8346E0";
    const tokenRecipient4 = "0xC8ecE128e77dFe3a3Bbd2c7d54101f2238F8b611";
    const tokenRecipient5 = "0x99790a857A1e740Ab8C386cA90657e65b0Cbe649";
    const tokenRecipient6 = "0xd2F980378333F349240301D92fe04ac6DBefB86a";
    const proposalDescription = `Mint Council tokens to team`;

    const mintCallData1 = councilToken.interface.encodeFunctionData("mint", [tokenRecipient1]);
    const mintCallData2 = councilToken.interface.encodeFunctionData("mint", [tokenRecipient2]);
    const mintCallData3 = councilToken.interface.encodeFunctionData("mint", [tokenRecipient3]);
    const mintCallData4 = councilToken.interface.encodeFunctionData("mint", [tokenRecipient4]);
    const mintCallData5 = councilToken.interface.encodeFunctionData("mint", [tokenRecipient5]);
    const mintCallData6 = councilToken.interface.encodeFunctionData("mint", [tokenRecipient6]);

    console.log('proposing')
    const contract = councilToken.address
    const tx = await governor.propose(
        [contract, contract, contract, contract, contract, contract], 
        [0, 0, 0, 0, 0, 0], 
        [mintCallData1, mintCallData2, mintCallData3, mintCallData4, mintCallData5, mintCallData6],
        proposalDescription,
    );
    await tx.wait();
    console.log('governance tx = ', tx)
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
