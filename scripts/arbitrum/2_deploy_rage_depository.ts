import { ethers, network, upgrades } from "hardhat";
import {
  RageDnDepository,
  UXDController,
  UXDRouter,
} from "../../typechain-types";
import { verify } from "../common/verify";
import fs from "fs";
import { loadConfig, loadCoreContracts } from "../common/loaders";
import { ArbitrumConfig } from "../../config/configs";
import { CoreContracts } from "../../config/contracts";
import { checkNetwork, NetworkName } from "../common/checkNetwork";

let controller: UXDController;
let depository: RageDnDepository;
let router: UXDRouter;
let config: ArbitrumConfig;
let coreContracts: CoreContracts;

async function main() {
  const hre = await import("hardhat")
  checkNetwork(hre, [NetworkName.ArbitrumGoerli, NetworkName.ArbitrumOne]);

  config = (await loadConfig(hre)) as ArbitrumConfig;
  coreContracts = await loadCoreContracts(hre);

  const UXDController = await ethers.getContractFactory("UXDController");
  controller = UXDController.attach(coreContracts.controller) as UXDController;

  const UXDRouter = await ethers.getContractFactory("UXDRouter");
  router = UXDRouter.attach(coreContracts.router) as UXDRouter;

  console.log(`controller address is ${controller.address}`)
  console.log(`vault address is ${config.contracts.RageGmxSeniorVault}`)
  const RageDnDepository = await ethers.getContractFactory("RageDnDepository");

  depository = await upgrades.deployProxy(RageDnDepository, [
    config.contracts.RageGmxSeniorVault,
    controller.address
  ], 
  {kind: "uups"}
  ) as RageDnDepository;

  await depository.deployed();
  console.log(`RageDnDepository deployed to ${depository.address}`);

  await setup();
  await verifyContracts();
  save();
  console.log("Complete 🚀🚀🚀");
}

async function setup() {
    console.log(`In Setup router address = ${router.address}, depository=${depository.address}`)
  console.log(
    `Registering depository => [asset=${config.tokens.USDC}, depository=${depository.address}]`
  );
  await (
    await router.registerDepository(depository.address, config.tokens.USDC)
  ).wait();

  const supplyCap = ethers.utils.parseEther("10000000");

  console.log(
    `Setting depository soft cap => ${ethers.utils.formatEther(supplyCap)}`
  );
  await (await depository.setRedeemableSoftCap(supplyCap)).wait();
}

async function verifyContracts() {
  console.log(`> Verifying depository: ${depository.address}`)
  await verify(depository.address);

  const depositoryImpl = await upgrades.erc1967.getImplementationAddress(depository.address)
  console.log(`> Verifying depositoryImpl: ${depositoryImpl}`)
  await verify(depositoryImpl);
}

function save() {
  console.log("Saving contract addresses...");
  const config = `
  {
    "rageTrade": "${depository.address}"
  }
  
  `;
  const folderPath = `./addresses/${network.name}`;
  fs.mkdirSync(folderPath, { recursive: true });
  const data = JSON.stringify(config);
  const filename = `${folderPath}/depositories.json`;
  fs.writeFileSync(filename, JSON.parse(data));
  console.log(`Address written to file: ${filename}`);
}



// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
