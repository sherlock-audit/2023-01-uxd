import { ethers } from "hardhat";
import { UXDController } from "../../typechain-types";
import "@nomiclabs/hardhat-etherscan";
import { EthereumConfig, OptimismConfig } from "../../config/configs";
import { loadConfig, loadControllerImpl, loadCoreContracts } from "../common/loaders";
import { ControllerImplContract, CoreContracts } from "../../config/contracts";

// global consts and vars
let controller: UXDController;
let config: OptimismConfig | OptimismConfig | EthereumConfig;
let coreContracts: CoreContracts;
let controllerImpl: ControllerImplContract;

async function main() {
  const hre = await import("hardhat");
  config = await loadConfig(hre);
  coreContracts = await loadCoreContracts(hre);
  controllerImpl = await loadControllerImpl(hre);
  // We get the contract to deploy
  await upgradeContracts();
}

async function upgradeContracts() {
  console.log(">>> Upgrading contract...")

  console.log("1 - ready to upgrade controller");
  const UXDController = await ethers.getContractFactory("UXDController");
  controller = UXDController.attach(coreContracts.controller) as UXDController;

  await (await controller.upgradeTo(controllerImpl.controllerImpl)).wait();

  console.log(`UXDController upgraded [Data=>Logic] [${controller.address}=>${controllerImpl.controllerImpl} ✅`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
