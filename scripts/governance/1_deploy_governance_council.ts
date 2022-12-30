import { network, ethers } from "hardhat";
import { UXDGovernor, UXDTimelockController, UXDCouncilToken } from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { constants } from "ethers";
import * as hre from "hardhat"
import fs from "fs";
import { loadConfig } from "../common/loaders";
import { verify } from "../common/verify";
import { ArbitrumConfig, EthereumConfig, OptimismConfig } from "../../config/configs";

// global consts and vars
let governor: UXDGovernor;
let timelock: UXDTimelockController;
let councilToken: UXDCouncilToken;
let admin: SignerWithAddress;
let config: EthereumConfig | OptimismConfig | ArbitrumConfig;
let tokenReceiver: string;

// constructor args
const minDelay = 300; // seconds
const proposers: string[] = [];
const executors: string[] = [];

async function main() {
  // We get the contract to deploy
  await deployContracts();
  await verifyContracts();
  await setupGovernance();
  await save();
}

async function deployContracts() {
  const signers = await ethers.getSigners();
  const hre = await import("hardhat");
  config = await loadConfig(hre);
  admin = signers[0]
  console.log("0 - ready to start");

  tokenReceiver = admin.address;
  console.log("1 - Deploying council token");
  const CounilToken = await ethers.getContractFactory("UXDCouncilToken");
  councilToken = await CounilToken.deploy(tokenReceiver) as UXDCouncilToken;
  await councilToken.deployed();
  console.log("1 - Council token deployed");

  console.log("2 - ready to deploy UXDTimelockController");
  const UXDTimeLockController = await ethers.getContractFactory("UXDTimelockController");
  
  timelock = await UXDTimeLockController.deploy(minDelay, proposers, executors) as UXDTimelockController;
  await timelock.deployed();
  console.log("2 - UXDTimelockController deployed");

  console.log("3 - ready to deploy Governor");
  const UXDGovernor = await ethers.getContractFactory("UXDGovernor");
  governor = await UXDGovernor.deploy(
    councilToken.address, 
    timelock.address,
    config.settings.governorParams
  ) as UXDGovernor;
  await governor.deployed();
  console.log("3 - Governor deployed");
}

async function setupGovernance() {
  console.log("4 - Setting up governance permissions");
  const adminRole = await timelock.TIMELOCK_ADMIN_ROLE();
  const proposerRole = await timelock.PROPOSER_ROLE();
  const executorRole = await timelock.EXECUTOR_ROLE();

  const proposerTx = await timelock.grantRole(proposerRole, governor.address);
  await proposerTx.wait();
  
  const executorTx = await timelock.grantRole(executorRole, constants.AddressZero);
  await executorTx.wait();

  const revokeTx = await timelock.revokeRole(adminRole, admin.address);
  await revokeTx.wait();
  console.log("4 - Governance permissions setup");
}

async function verifyContracts() {
  console.log(">>> Verifying contracts...")
  // Council token
   console.log(`> Verifying council token: ${councilToken.address}`)
  await verify(councilToken.address, [
    tokenReceiver
  ]).catch(err => console.log("caught verification error", err));

   // Timelock
   console.log(`> Verifying timelock: ${timelock.address}`)
  await verify(timelock.address, [
      minDelay,
      proposers,
      executors
  ]).catch(err => console.log("caught verification error", err))

   // Governor
   console.log(`> Verifying governor: ${governor.address}`)
   verify(governor.address, [
      councilToken.address,
      timelock.address,
      config.settings.governorParams
   ]).catch(err =>  console.log("caught verification error", err))

  console.log("Contract verification done ✅")
}

async function save() {
  const config = `
  {
    "timelock": "${timelock.address}",
    "governor": "${governor.address}",
    "token": "${councilToken.address}"
  }
  `;
  const folderPath = `./addresses/${network.name}`;
  fs.mkdirSync(folderPath, { recursive: true });
  const data = JSON.stringify(config);
  const filename = `${folderPath}/governance_council.json`;
  fs.writeFileSync(filename, JSON.parse(data));
  console.log(`Address written to file: ${filename}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
