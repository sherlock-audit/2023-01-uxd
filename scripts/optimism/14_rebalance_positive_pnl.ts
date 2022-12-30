import { ethers } from "hardhat";
import { OptimismConfig } from "../../config/configs";
import { Depositories } from "../../config/contracts";
import { loadConfig, loadCoreContracts, loadDepositories, loadPerpPeriphery } from "../common/loaders";

const usdcDecimals = 6;

async function main() {
  const hre = await import("hardhat")
  const config = await loadConfig(hre) as OptimismConfig;
  const coreContracts = await loadCoreContracts(hre);
  const depositories = await loadDepositories(hre) as Depositories;
  const periphery = await loadPerpPeriphery(hre)

  const signers = await ethers.getSigners();
  const admin = signers[0];
  console.log(">>> Rebalance positive PnL")
  const PerpDepository = await ethers.getContractFactory("PerpDepository");
  const depository = PerpDepository.attach(depositories.perpetualProtocol);

  const PerpAccountProxy = await ethers.getContractFactory("PerpAccountProxy");
  const proxy = PerpAccountProxy.attach(periphery.accountProxy);

  const UXD = await ethers.getContractFactory("UXDToken");
  const uxdToken = UXD.attach(coreContracts.uxd);
  let uxdTotalSupply = await uxdToken.totalSupply();
  console.log("UXD total supply = ", ethers.utils.formatEther(uxdTotalSupply));

  let positionValue = await depository.getPositionValue();
  console.log("Perp position value = ", ethers.utils.formatEther(positionValue));
  let positionSize = await proxy.getTotalPositionSize(depository.address, config.contracts.PerpVETHMarket);
  console.log("Perp position size before = ", ethers.utils.formatEther(positionSize));

  const usdcAmount = ethers.utils.parseUnits("10.0", usdcDecimals)
  const wethAmount = ethers.utils.parseEther("0.1")
  const polarity = 1;
  const targetPrice = 0;

  console.log("Approving depository");
  const ERC20 = await ethers.getContractFactory("TestERC20");
  const WETH9 = ERC20.attach(config.tokens.WETH);
  let positionPnl = await depository.getUnrealizedPnl();
  console.log('Pnl before = ', ethers.utils.formatEther(positionPnl))

  console.log("approving WETH");
  await (await WETH9.approve(depository.address, wethAmount)).wait();
  console.log("approved ... ");
  const tx = await depository.rebalanceLite(usdcAmount, polarity, targetPrice, admin.address);
  console.log("rebalance tx = ", tx.hash);
  positionValue = await depository.getPositionValue();
  console.log("Perp position value = ", ethers.utils.formatEther(positionValue));
  positionSize = await proxy.getTotalPositionSize(depository.address, config.contracts.PerpVETHMarket);
  console.log("Perp position size after = ", ethers.utils.formatEther(positionSize));

  positionPnl = await depository.getUnrealizedPnl();
  console.log('Pnl after = ', ethers.utils.formatEther(positionPnl))
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
