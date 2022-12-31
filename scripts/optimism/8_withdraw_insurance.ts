import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { loadConfig, loadCoreContracts, loadDepositories } from "../common/loaders";
import { OptimismConfig } from "../../config/configs";
import { Depositories } from "../../config/contracts";
import { PerpDepository } from "../../typechain-types";

let bob: SignerWithAddress;
let admin: SignerWithAddress;
let tx;
const usdcDecimals = 6;

async function main() {
  const hre = await import("hardhat")
  const signers = await ethers.getSigners();
  const config = await loadConfig(hre) as OptimismConfig;
  const coreContracts = await loadCoreContracts(hre);
  [admin, bob] = signers;

  const depositories = await loadDepositories(hre) as Depositories;
  const Depository = await ethers.getContractFactory("PerpDepository");
  const depository = Depository.attach(depositories.perpetualProtocol!) as PerpDepository;

  const usdcAmount = ethers.utils.parseUnits("10", usdcDecimals);
  // withdraw USDC insurance
  console.log("withdrawing USDC to ", config.addresses.TokenReceiver)
  tx = await depository.withdrawInsurance(
    usdcAmount,
    config.addresses.TokenReceiver
  );
  await tx.wait();
  console.log("withdrawInsurance tx = ", tx.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
