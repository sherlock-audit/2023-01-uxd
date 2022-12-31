import { network, ethers, upgrades } from "hardhat";
import { PerpDepository, Uniswapper, UXDRouter } from "../../typechain-types";
import { OptimismConfig } from "../../config/configs";
import { loadConfig, loadCoreContracts } from "../common/loaders";
import { verify } from "../common/verify";
import core from "../../addresses/optimismgoerli/core.json";
import fs from "fs";
import { CoreContracts } from "../../config/contracts";

// global consts and vars
let config: OptimismConfig
let coreContracts: CoreContracts
let depository: PerpDepository;
let swapper: Uniswapper;
const redeemableSoftCap = ethers.utils.parseEther("1000000");

async function main() {
  const hre = await import("hardhat")
  // We get the contract to deploy
  config = await loadConfig(hre) as OptimismConfig;
  coreContracts = await loadCoreContracts(hre);

  await deployContracts();
  await setup();
  await save();
  await verifyContracts();
}

async function deployContracts() {
  console.log("0 - ready to start");

  console.log("1 - ready to deploy depository");
  const PerpDepository = await ethers.getContractFactory("PerpDepository");
  depository = await upgrades.deployProxy(PerpDepository, [
    config.contracts.PerpVault, // PERP vault
    config.contracts.PerpClearingHouse, // PERP clearing house
    config.contracts.PerpMarketRegistry, // PERP market registtry
    config.contracts.PerpVETHMarket, // PERP futures market
    config.tokens.WETH, // assetToken
    config.tokens.USDC, // quoteToken
    coreContracts.controller, // controller
  ],
  {kind: "uups"}
  ) as PerpDepository;
  await depository.deployed();
  console.log(`Depository proxy deployed to: ${depository.address} ✅`);

  const Uniswapper = await ethers.getContractFactory("Uniswapper");
  swapper = await Uniswapper.deploy(config.contracts.UniSwapRouter) as Uniswapper;
  await swapper.deployed();

  console.log(`Uniswapper deployed to: ${swapper.address} ✅`);
}

async function verifyContracts() {
  console.log(">>> Verifying contracts...")
  
  // PerpDepository
  console.log(`> Verifying depository: ${depository.address}`)
  await verify(depository.address /*, [
    config.contracts.PerpVault, // PERP vault
    config.contracts.PerpClearingHouse, // PERP clearing house
    config.contracts.PerpMarketRegistry, // PERP market registtry
    config.contracts.PerpVETHMarket, // PERP futures market
    config.tokens.WETH, // assetToken
    config.tokens.USDC, // quoteToken
    coreContracts.controller, // controller
  ] */);

  const depositoryImpl = await upgrades.erc1967.getImplementationAddress(depository.address)
  console.log(`> Verifying depositoryImpl: ${depositoryImpl}`)
  await verify(depositoryImpl);

  console.log(`> Verifying Uniswapper: ${swapper.address}`)
  verify(swapper.address, [config.contracts.UniSwapRouter])

  console.log("Contract verification done ✅")
}

async function setup() {
  const UXDRouter = await ethers.getContractFactory("UXDRouter");
  let router = UXDRouter.attach(core.router) as UXDRouter;

  await (await depository.setRedeemableSoftCap(redeemableSoftCap)).wait();
  await (await depository.setSpotSwapper(swapper.address)).wait();

  console.log("registering depository routes")
  await (await router.registerDepository(depository.address, config.tokens.WETH)).wait()
  await (await router.registerDepository(depository.address, config.tokens.USDC)).wait()
}

async function save() {
  const config = `
  {
    "perpetualProtocol": "${depository.address}"
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
