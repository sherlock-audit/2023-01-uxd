import { network, ethers, upgrades } from "hardhat";
import * as hre from "hardhat"
import "@nomiclabs/hardhat-etherscan";
import fs from "fs";
import { CoreContracts } from "../../config/contracts";
import { loadCoreContracts } from "../common/loaders";
import { verify } from "../common/verify";

// global consts and vars
let controllerAddress: any;
let coreContracts: CoreContracts;

async function main() {
  // We get the contract to deploy
  const hre = await import("hardhat")
  coreContracts = await loadCoreContracts(hre);
  await deployContracts();
  await verifyContracts();
  await save();
}

async function deployContracts() {
  console.log(">>> Deploying contracts...")

  console.log("1 - ready to deploy controller");
  const UXDController = await ethers.getContractFactory("UXDController");
  controllerAddress = await upgrades.prepareUpgrade(
    coreContracts.controller, 
    UXDController, 
    {kind: "uups", unsafeAllowRenames: true}
  );
  console.log(`New UXDController deployed to ${controllerAddress} ✅`);
}

async function verifyContracts() {
  console.log(">>> Verifying contracts...")

  console.log(`> Verifying controllerImpl: ${controllerAddress}`)
  verify(controllerAddress);

  // await hre.run("verify:verify", {
  //   contract: "contracts/core/UXDController.sol:UXDController",
  //   address: controllerAddress,
  //   constructorArguments: []
  // }).catch(err => console.log("caught verification error[controllerImpl]", err)) 

  console.log("Contract verification done ✅")
}

async function save() {
    const config = `
    {
      "controllerImpl": "${controllerAddress}"
    }
    `;
    const folderPath = `./addresses/${network.name}`;
    fs.mkdirSync(folderPath, { recursive: true });
    const data = JSON.stringify(config);
    const filename = `${folderPath}/controller_impl.json`;
    fs.writeFileSync(filename, JSON.parse(data));
    console.log(`Address ${controllerAddress} written to file: ${filename}`);
  }

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
