import { ethers, network, upgrades } from "hardhat";
import { UXDController, UXDRouter, UXDToken } from "../../typechain-types";
import { verify } from "../common/verify";
import { checkNetwork, NetworkName } from "../common/checkNetwork";
import fs from "fs";
import { loadConfig } from "../common/loaders";
import { ArbitrumConfig } from "../../config/configs";

let config: ArbitrumConfig;
let controller: UXDController;
let router: UXDRouter;
let uxdToken: UXDToken;

async function main() {
  const hre = await import("hardhat")
  checkNetwork(hre, [NetworkName.ArbitrumGoerli, NetworkName.ArbitrumOne]);

  config = await loadConfig(hre) as ArbitrumConfig

  console.log("Deploying controller...")
  const UXDController = await ethers.getContractFactory("UXDController");
  controller = await upgrades.deployProxy(UXDController, [
    config.tokens.WETH
  ],
  {kind:"uups"}) as UXDController
  console.log(`Controller deployed to ${controller.address}`);

  const Router = await ethers.getContractFactory("UXDRouter");
  router = await Router.deploy() as UXDRouter;
  await router.deployed();
  console.log(`UXDRouter deployed to ${router.address}`)

  const UXDToken = await ethers.getContractFactory("UXDToken");
  uxdToken = await UXDToken.deploy(controller.address, config.layerZero.current.endpoint) as UXDToken;
  await uxdToken.deployed();
  console.log(`UXDToken deployed to ${uxdToken.address}`);

  save();
  await setup();
  await verifyContracts();
  console.log("Complete 🚀🚀🚀")
}

async function setup() {
  const mintCap = ethers.utils.parseEther("10000000");
  console.log(`Setting supply cap => ${ethers.utils.formatEther(mintCap)}`);
  await (await (uxdToken.setLocalMintCap(mintCap))).wait();
  console.log(`Setting router => ${router.address}`);
  await (await controller.updateRouter(router.address)).wait();
  console.log(`Setting redeemable => ${uxdToken.address}`)
  await (await controller.setRedeemable(uxdToken.address)).wait();
  console.log(`Whitelisting asset ${config.tokens.USDC}`)
  await (await controller.whitelistAsset(config.tokens.USDC, true)).wait();
}

async function verifyContracts() {
    await verify(controller.address);
    await verify(router.address);
    await verify(uxdToken.address, [controller.address]);
}

function save() {
  console.log("Saving contract addresses...")
  const config = `
  {
    "controller": "${controller.address}",
    "router": "${router.address}",
    "uxd": "${uxdToken.address}"
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
