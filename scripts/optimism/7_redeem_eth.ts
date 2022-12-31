import {  ethers } from "hardhat";
import { OptimismConfig } from "../../config/configs";
import { UXDController } from "../../typechain-types";
import { loadConfig, loadCoreContracts } from "../common/loaders";

async function main() {
  const hre = await import("hardhat")
  console.log(">>> Redeem ETH")
  const config = await loadConfig(hre) as OptimismConfig;
  const coreContracts = await loadCoreContracts(hre);
  const signers = await ethers.getSigners();
  const admin = signers[0];
  const Controller = await ethers.getContractFactory("UXDController");
  const controller = Controller.attach(coreContracts.controller) as UXDController;

  const UXD = await ethers.getContractFactory("UXDToken");
  const uxdToken = UXD.attach(coreContracts.uxd);
  let uxdTotalSupply = await uxdToken.totalSupply();
  console.log("UXD total supply = ", ethers.utils.formatEther(uxdTotalSupply));

  // // redeem WETH
  const myBalance = await uxdToken.balanceOf(admin.address);
  const uxdAmount = ethers.utils.parseEther("10")
  console.log("Approving UXD amount: ", ethers.utils.formatEther(uxdAmount))
  const approvalTx = await (await uxdToken.approve(controller.address, uxdAmount)).wait()
  console.log("approval tx = ", approvalTx.transactionHash)
  
  console.log("redeeming ETH")
  const tx = await (await controller.redeemForEth(uxdAmount, 0, config.addresses.Deployer)).wait();
  console.log("redeem tx = ", tx.transactionHash);

  uxdTotalSupply = await uxdToken.totalSupply();
  console.log("UXD total supply = ", ethers.utils.formatEther(uxdTotalSupply));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
