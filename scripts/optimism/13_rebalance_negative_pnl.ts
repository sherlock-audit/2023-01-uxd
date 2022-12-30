import { ethers } from "hardhat";
import { OptimismConfig } from "../../config/configs";
import { Depositories } from "../../config/contracts";
import { PerpDepository } from "../../typechain-types";
import { loadConfig, loadCoreContracts, loadDepositories, loadPerpPeriphery } from "../common/loaders";

let tx;
const usdcDecimals = 6;

async function main() {
  const hre = await import("hardhat");
  const config = await loadConfig(hre) as OptimismConfig;
  const coreContracts = await loadCoreContracts(hre);
  const depositories = await loadDepositories(hre) as Depositories;
  const periphery = await loadPerpPeriphery(hre);
  const signers = await ethers.getSigners();
  const admin = signers[0];
  console.log(">>> Rebalance negative PnL")
  const PerpDepository = await ethers.getContractFactory("PerpDepository");
  const depository = PerpDepository.attach(depositories.perpetualProtocol) as PerpDepository;

  const PerpAccountProxy = await ethers.getContractFactory("PerpAccountProxy");
  const proxy = PerpAccountProxy.attach(periphery.accountProxy);

  let positionValue = await depository.getPositionValue();
  console.log("Perp position value before = ", ethers.utils.formatEther(positionValue));
  let positionSize = await proxy.getTotalPositionSize(depositories.perpetualProtocol, config.contracts.PerpVETHMarket);
  console.log("Perp position size before = ", ethers.utils.formatEther(positionSize));

  const usdcAmount = ethers.utils.parseUnits("4.7", usdcDecimals);
  const polarity = -1;
  const targetPrice = 0;

  console.log("Approving depository");
  const ERC20 = await ethers.getContractFactory("TestERC20");
  const USDC = ERC20.attach(config.tokens.USDC);

  console.log("approving USDC");
  await (await USDC.approve(depositories.perpetualProtocol, usdcAmount)).wait();
  console.log("approved ... ");
  let pnl = await depository.getUnrealizedPnl()
  let amountToRebalance = pnl.abs();
  console.log("Delta neutral position pnl = ", ethers.utils.formatEther(pnl))
  const tx = await depository.rebalanceLite(usdcAmount, polarity, targetPrice, admin.address);
  console.log("rebalance tx = ", tx.hash);
  positionValue = await depository.getPositionValue();
  console.log("Perp position value after = ", ethers.utils.formatEther(positionValue));
  positionSize = await proxy.getTotalPositionSize(depositories.perpetualProtocol, config.contracts.PerpVETHMarket);
  console.log("Perp position size after = ", ethers.utils.formatEther(positionSize));
  pnl = await depository.getUnrealizedPnl()
  console.log("Delta neutral position pnl = ", ethers.utils.formatEther(pnl))
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
