import { ethers, network, upgrades } from "hardhat";
import { UXDRouter, UXDController, UXDToken } from "../../typechain-types";
import { OptimismConfig } from "../../config/configs"
import { loadConfig } from "../common/loaders";
import * as hre from "hardhat"
import fs from "fs";
import { verify } from "../common/verify";
import { checkNetwork, NetworkName } from "../common/checkNetwork";

// global consts and vars
let config: OptimismConfig;
let controller: UXDController;
let router: UXDRouter;
let uxd: UXDToken;

async function main() {
  const hre = await import("hardhat")
  checkNetwork(hre, [NetworkName.Optimism, NetworkName.OptimismGoerli]);
  
  config = await loadConfig(hre) as OptimismConfig;
  
  await deployContracts();
  await verifyContracts();
  await setup();
  await save();
}

async function deployContracts() {
  console.log(">>> Deploying contracts...")

  console.log("0 - ready to start");
  
  console.log("1 - ready to deploy controller");
  const UXDController = await ethers.getContractFactory("UXDController");
  controller = await upgrades.deployProxy(UXDController, [
    config.tokens.WETH
  ],
  {kind:"uups"}) as UXDController
  await controller.deployed();
  console.log(`UXDController deployed to ${controller.address} ✅`);

  console.log("2 - ready to deploy router");
  const Router = await ethers.getContractFactory("UXDRouter");
  router = await Router.deploy() as UXDRouter;
  await router.deployed();
  console.log(`Router deployed to => ${router.address} ✅`)

  console.log("3 - ready to deploy UXDToken");
  const UXDToken = await ethers.getContractFactory("UXDToken");
  uxd = await UXDToken.deploy(controller.address, config.layerZero.current.endpoint) as UXDToken;
  await uxd.deployed();
  console.log(`UXD token deployed to address:  ${uxd.address} ✅`)
}

async function verifyContracts() {
  console.log(">>> Verifying contracts...")

  // UXDController
  console.log(`> Verifying controller: ${controller.address}`)
  await verify(controller.address);

  const controllerImpl = await upgrades.erc1967.getImplementationAddress(controller.address);
  console.log(`> Verifying controllerImpl: ${controllerImpl}`)
  await verify(controllerImpl);

  // UXDRouter
  console.log(`> Verifying router: ${router.address}`)
  await verify(router.address);

  // UXD token
  console.log(`> Verifying UXD token: ${uxd.address}`)
  await verify(uxd.address);
  console.log("Contract verification done ✅")

  const contractAddresses = [
    {
      name: "UXDController",
      address: controllerImpl
    },
    {
      name: "UXDRouter",
      address: router.address 
    },
    {
      name: "UXDToken",
      address: uxd.address
    }
  ];
  await hre.tenderly.persistArtifacts(...contractAddresses);

  console.log("Contract verification done ✅")
}

async function setup() {
  await (await controller.whitelistAsset(config.tokens.WETH, true)).wait();
  await (await controller.whitelistAsset(config.tokens.USDC, true)).wait();
  await (await controller.updateRouter(router.address)).wait();
  

  const mintCap = ethers.utils.parseEther("2000000");
  console.log("2 - setting redeemable token address in controller")
  await (await controller.setRedeemable(uxd.address)).wait();
  await (await uxd.setLocalMintCap(mintCap)).wait()
}

async function save() {
  const config = `
  {
    "controller": "${controller.address}",
    "router": "${router.address}",
    "uxd": "${uxd.address}"
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
