import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { PerpDepository } from "../../typechain-types";
import { OptimismConfig } from "../../config/configs";
import { loadConfig, loadDepositories } from "../common/loaders";
import { Depositories } from "../../config/contracts";

let bob: SignerWithAddress;
let admin: SignerWithAddress;
let config: OptimismConfig
let tx;

const usdcDecimals = 6;

async function main() {
  const hre = await import("hardhat")
  const signers = await ethers.getSigners();
  [admin, bob] = signers;
  config = await loadConfig(hre) as OptimismConfig;
  const depositories = await loadDepositories(hre) as Depositories;
  const Depository = await ethers.getContractFactory("PerpDepository");
  const depository = Depository.attach(depositories.perpetualProtocol!) as PerpDepository;

  const ERC20 = await ethers.getContractFactory("TestERC20");
  const USDC = ERC20.attach(config.tokens.USDC);

  const usdcAmount = ethers.utils.parseUnits("10", usdcDecimals)

  console.log("approving USDC");
  tx = await USDC.approve(depository.address, usdcAmount);
  await tx.wait();

  console.log("depositing USDC");
  tx = await depository.depositInsurance(usdcAmount, admin.address);
  await tx.wait()
  console.log("depositInsurance USDC tx = ", tx.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
