import { ethers } from "hardhat";
import { RageDnDepository } from "../../typechain-types";
import "@nomiclabs/hardhat-etherscan";
import { CoreContracts, Depositories, DepositoryImplContract } from "../../config/contracts";
import { loadCoreContracts, loadDepositories, loadRageDepositoryImpl } from "../common/loaders";

// global consts and vars
let depository: RageDnDepository;
let coreContracts: CoreContracts;
let depositoryImpl: DepositoryImplContract;
let depositories: Depositories;

async function main() {
  // We get the contract to deploy
  const hre = await import("hardhat")
  coreContracts = await loadCoreContracts(hre);
  depositories = await loadDepositories(hre);
  depositoryImpl = await loadRageDepositoryImpl(hre);
  await upgradeContracts();
}

async function upgradeContracts() {
  console.log(">>> Deploying contracts...")

  console.log("1 - ready to upgrade depository");
  const Depository = await ethers.getContractFactory("RageDnDepository");
  depository = Depository.attach(depositories.rageTrade!) as RageDnDepository;
  await (await depository.upgradeTo(depositoryImpl.depositoryImpl)).wait();
  console.log(`RageDnDepository upgraded [Data => Logic] [${depository.address} => ${depositoryImpl.depositoryImpl} ✅`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
