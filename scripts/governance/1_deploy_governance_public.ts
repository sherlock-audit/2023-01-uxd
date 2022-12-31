import { network, ethers } from "hardhat";
import { UXDGovernor, UXPToken, UXDTimelockController } from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, constants } from "ethers";
import { loadConfig } from "../common/loaders";
import { verify } from "../common/verify";
import fs from "fs";

// global consts and vars
let governor: UXDGovernor;
let timelock: UXDTimelockController;
let uxpToken: UXPToken;
let admin: SignerWithAddress
let tokenCustodian: string
let tokenTotalSupply: BigNumber
let lzEndpoint: string

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
  const hre = await import("hardhat")
  const config = await loadConfig(hre)
  const signers = await ethers.getSigners()
  admin = signers[0]
  console.log("0 - ready to start");

  console.log("1 - ready to deploy UXPToken");
  const UXPToken = await ethers.getContractFactory("UXPToken");
  tokenCustodian = admin.address;
  tokenTotalSupply = ethers.utils.parseEther(config.settings.uxpTotalSupply);
  lzEndpoint = config.layerZero.current.endpoint

  console.log("2 - ready to deploy UXDTimelockController");
  const UXDTimeLockController = await ethers.getContractFactory("UXDTimelockController");
  timelock = await UXDTimeLockController.deploy(minDelay, proposers, executors) as UXDTimelockController;
  await timelock.deployed();
  console.log(`2 - UXDTimelockController deployed at ${timelock.address}`);

  uxpToken = await UXPToken.deploy(tokenCustodian, tokenTotalSupply, lzEndpoint) as UXPToken;
  await uxpToken.deployed();
  console.log(`1 - UXPToken deployed at ${uxpToken.address}`);

  console.log("3 - ready to deploy Governor");
  const UXDGovernor = await ethers.getContractFactory("UXDGovernor");
  governor = await UXDGovernor.deploy(
    uxpToken.address, 
    timelock.address, 
    config.settings.governorParams
  ) as UXDGovernor;
  await governor.deployed();
  console.log(`3 - Governor deployed at ${governor.address}`);
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

  // UXP token
  console.log(`> Verifying token: ${uxpToken.address}`)
  verify(uxpToken.address, [
    tokenCustodian,
    tokenTotalSupply,
    lzEndpoint
  ]).catch(err => console.log("caught verification error", err))

   // Timelock
   console.log(`> Verifying timelock: ${timelock.address}`)
   verify(timelock.address, [
    minDelay,
    proposers,
    executors
   ]).catch(err => console.log("caught verification error", err))

    // Governor
  console.log(`> Verifying governor: ${governor.address}`)
  verify(governor.address, [
    uxpToken.address,
    timelock.address 
  ]).catch(err => console.log("caught verification error", err))
  console.log("Contract verification done ✅")
}

async function save() {
  const config = `
  {
    "timelock": "${timelock.address}",
    "governor": "${governor.address}",
    "token": "${uxpToken.address}"
  }
  `;
  const folderPath = `./addresses/${network.name}`;
  fs.mkdirSync(folderPath, { recursive: true });
  const data = JSON.stringify(config);
  const filename = `${folderPath}/governance_public.json`;
  fs.writeFileSync(filename, JSON.parse(data));
  console.log(`Address written to file: ${filename}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
