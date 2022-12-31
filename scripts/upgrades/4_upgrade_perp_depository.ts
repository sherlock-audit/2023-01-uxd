import { ethers, upgrades } from "hardhat";
import { PerpDepository } from "../../typechain-types";
import * as hre from "hardhat"
import "@nomiclabs/hardhat-etherscan";
import { CoreContracts, Depositories, DepositoryImplContract } from "../../config/contracts";
import { loadCoreContracts, loadDepositories, loadPerpDepositoryImpl } from "../common/loaders";

// global consts and vars
let depository: PerpDepository;
let coreContracts: CoreContracts;
let depositoryImpl: DepositoryImplContract;
let depositories: Depositories;

async function main() {
  // We get the contract to deploy
  const hre = await import("hardhat")
  coreContracts = await loadCoreContracts(hre);
  depositories = await loadDepositories(hre);
  depositoryImpl = await loadPerpDepositoryImpl(hre);
  await upgradeContracts();
  // await updateController(); // not needed, already done
  // await verifyContracts();
}

async function upgradeContracts() {
  console.log(">>> Deploying contracts...")

  console.log("1 - ready to upgrade depository");
  const Depository = await ethers.getContractFactory("PerpDepository");

  depository = Depository.attach(depositories.perpetualProtocol!) as PerpDepository;
  await (await depository.upgradeTo(depositoryImpl.depositoryImpl)).wait();
  console.log(`PerpDepository upgraded [Data => Logic] [${depository.address} => ${depositoryImpl.depositoryImpl} ✅`);
}

async function updateController() {
  await (await depository.setController(coreContracts.controller)).wait();
}

async function verifyContracts() {
  console.log(">>> Verifying contracts...")

  const depositoryImpl = await upgrades.erc1967.getImplementationAddress(depository.address);
  console.log(`> Verifying depositoryImpl: ${depositoryImpl}`)
  await hre.run("verify:verify", {
    address: depositoryImpl,
    constructorArguments: []
  }).catch(err => console.log("caught verification error[depositoryImpl]", err)) 

  console.log("Contract verification done ✅")
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
