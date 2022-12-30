import { network, ethers } from "hardhat";
import { UXDRouter } from "../../typechain-types";
import fs from "fs";
import { CoreContracts, Depositories } from "../../config/contracts";
import { loadConfig, loadCoreContracts, loadDepositories } from "../common/loaders";
import { OptimismConfig } from "../../config/configs";

/// Note: This deploys a new router but does not update the router reference in the controller.
/// To do that a new governance proposal must be created.

// global consts and vars
let config: OptimismConfig;
let router: UXDRouter;
let coreContracts: CoreContracts;
let depositories: Depositories;
let tx;

async function main() {
  // We get the contract to deploy
  await deployContracts();
  await save();
}

async function deployContracts() {
  const hre = await import("hardhat")
  coreContracts = await loadCoreContracts(hre);
  depositories = await loadDepositories(hre) as Depositories
  console.log("1 - ready to deploy router");
  const Router = await ethers.getContractFactory("UXDRouter");
  router = await Router.deploy() as UXDRouter;
  await router.deployed();

  console.log("Router deployed to ", router.address);

  // if not live network
  await registerDepositoryNoGovernance();
}

// In testnet or live environments this function will not work as router can only
// be updated in controller and depository through governance proposal.
async function registerDepositoryNoGovernance() {
  const hre = await import("hardhat")
  config = await loadConfig(hre) as OptimismConfig;
  const Controller = await ethers.getContractFactory("UXDController");
  const controller = Controller.attach(coreContracts.controller);

  console.log("2 - ready to register depository with router");
  await (await router.registerDepository(depositories.perpetualProtocol!, config.tokens.WETH)).wait()
  await (await router.registerDepository(depositories.perpetualProtocol!, config.tokens.USDC)).wait()

  console.log("3 - Update router in controller");
  await (await controller.updateRouter(router.address)).wait()

  console.log("Done 🚀🚀")
}

async function save() {
  const config = `
  {
    "controller": "${coreContracts.controller}",
    "router": "${router.address}",
    "uxd": "${coreContracts.uxd}"
  }
  
  `;
  const folderPath = `./addresses/${network.name}`;
  fs.mkdirSync(folderPath, { recursive: true });
  const data = JSON.stringify(config);
  const filename = `${folderPath}/core.json`;
  fs.writeFileSync(filename, JSON.parse(data));
  console.log(`Address written to file: ${filename}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
