import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { loadConfig, loadCoreContracts } from "../common/loaders";
import { OptimismConfig } from "../../config/configs";

let bob: SignerWithAddress;
let admin: SignerWithAddress;
let tx;

async function main() {
  const hre = await import("hardhat")
  console.log(">>> Mint with ETH")
  const config = await loadConfig(hre) as OptimismConfig;
  const coreContracts = await loadCoreContracts(hre);
  const signers = await ethers.getSigners();
  [admin, bob] = signers;
  const Controller = await ethers.getContractFactory("UXDController");

  const controller = Controller.attach(coreContracts.controller);
  const UXD = await ethers.getContractFactory("UXDToken");
  const uxdToken = UXD.attach(coreContracts.uxd);

  const ethAmount = ethers.utils.parseEther("0.01");
  let uxdTotalSupply = await uxdToken.totalSupply();
  console.log("UXD total supply = ", ethers.utils.formatEther(uxdTotalSupply));

  console.log("minting with ETH");
  tx = await (await controller.mintWithEth(0, config.addresses.Deployer, {value: ethAmount})).wait();
  console.log("mint with ETH tx = ", tx.transactionHash);
  
  uxdTotalSupply = await uxdToken.totalSupply();
  console.log("UXD total supply = ", ethers.utils.formatEther(uxdTotalSupply));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
