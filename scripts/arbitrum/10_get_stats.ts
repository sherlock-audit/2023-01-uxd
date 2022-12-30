import { ethers } from "hardhat";
import { Depositories } from "../../config/contracts";
import { loadCoreContracts, loadDepositories } from "../common/loaders";

async function main() {
    const hre = await import("hardhat")
    const coreContracts = await loadCoreContracts(hre);
    const depositories = await loadDepositories(hre) as Depositories

    const Depository = await ethers.getContractFactory("RageDnDepository");
    const depository = Depository.attach(depositories.rageTrade!);

    const UXDToken = await ethers.getContractFactory("UXDToken");
    const token = UXDToken.attach(coreContracts.uxd);

    // const shares;
    const assetDeposited = await depository.netAssetDeposits();
    console.log(`Assets deposited = ${ethers.utils.formatUnits(assetDeposited, 6)}`)

    const totalSupply = await token.totalSupply();
    console.log(
        `UXD total supply = ${ethers.utils.formatEther(totalSupply)}`
    );

    const assets = await depository.getDepositoryAssets();
    console.log(`Depository Assets = ${ethers.utils.formatUnits(assets, 6)}`)

    const pnl = await depository.getUnrealizedPnl();
    console.log(`Unrealized PnL = ${ethers.utils.formatUnits(pnl, 6)}`)
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });