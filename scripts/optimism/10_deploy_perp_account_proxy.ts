import { network, ethers } from "hardhat";
import { PerpAccountProxy } from "../../typechain-types";
import fs from "fs";
import { loadConfig } from "../common/loaders";
import { OptimismConfig } from "../../config/configs";
import { verify } from "../common/verify";

/// Note: This deploys a new router but does not update the router reference in the controller.
/// To do that a new governance proposal must be created.

// global consts and vars
let accountProxy: PerpAccountProxy;
let config: OptimismConfig;

async function main() {
  const hre = await import("hardhat")
  config = await loadConfig(hre) as OptimismConfig;
  // We get the contract to deploy
  await deployContracts();
  await save();
  await verifyContracts();
}

async function deployContracts() {
    console.log("4 - ready to deploy account proxy");
    const PerpAccountProxy = await ethers.getContractFactory("PerpAccountProxy");
    accountProxy = await PerpAccountProxy.deploy(
      config.contracts.PerpAccountBalance, 
      config.contracts.PerpClearingHouse
    ) as PerpAccountProxy;
    await accountProxy.deployed();
}

async function verifyContracts() {
  // AccountProxy
  console.log(`>> verifying account proxy: ${accountProxy.address}`)
  await verify(accountProxy.address, [
    config.contracts.PerpAccountBalance, 
    config.contracts.PerpClearingHouse
  ]);
  console.log(`verification complete ✅`)
}

async function save() {
  const config = `
  {
    "accountProxy": "${accountProxy.address}"
  }
  
  `;
  const folderPath = `./addresses/${network.name}`;
  fs.mkdirSync(folderPath, { recursive: true });
  const data = JSON.stringify(config);
  const filename = `${folderPath}/perpAccountProxy.json`;
  fs.writeFileSync(filename, JSON.parse(data));
  console.log(`Address written to file: ${filename}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
