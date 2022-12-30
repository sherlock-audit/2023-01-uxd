import { ethers } from "hardhat";
import { loadCoreContracts } from "../common/loaders";

async function main() {
    const hre = await import("hardhat")
    const coreContracts = await loadCoreContracts(hre);

    const UXDToken = await ethers.getContractFactory("UXDToken");
    const token = UXDToken.attach(coreContracts.uxd);

    const totalSupply = await token.totalSupply();
    console.log(
        `UXD total supply = ${ethers.utils.formatEther(totalSupply)}`
    );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });