import { ethers } from "hardhat";
import { PerpAccountProxy, PerpDepository } from "../../typechain-types";
import { PerpetualProtocol } from "@perp/sdk-curie";
import { OptimismConfig } from "../../config/configs";
import { loadConfig, loadCoreContracts, loadDepositories, loadPerpPeriphery } from "../common/loaders";
import { Depositories } from "../../config/contracts";

let perp: PerpetualProtocol;
let config: OptimismConfig;

async function main() {
  const hre = await import("hardhat")
  config = await loadConfig(hre) as OptimismConfig;
  const depositories = await loadDepositories(hre) as Depositories;
  const periphery = await loadPerpPeriphery(hre);
  const coreContracts = await loadCoreContracts(hre);
  await setupPerp();
  const AccountProxy = await ethers.getContractFactory("PerpAccountProxy");
  const proxy: PerpAccountProxy = AccountProxy.attach(periphery.accountProxy) as PerpAccountProxy;

  const Depository = await ethers.getContractFactory("PerpDepository");
  const depository = Depository.attach(depositories.perpetualProtocol!) as PerpDepository;
  const address = depository.address;
  console.log("Depository addresss = ", address)
  
  const UXD = await ethers.getContractFactory("UXDToken");
  const uxdToken = UXD.attach(coreContracts.uxd);

  const openNotional = await proxy.getTotalOpenNotional(address, config.contracts.PerpVETHMarket);
  console.log("openNotional = ", ethers.utils.formatEther(openNotional));
  const debtValue = await proxy.getTotalDebtValue(address);
  console.log("debtValue = ", ethers.utils.formatEther(debtValue));
  
  const currentDebtValue = await depository.getDebtValue(depository.address);
  console.log("current debt value = ", ethers.utils.formatEther(currentDebtValue));

  const insuranceDeposited = await depository.insuranceDeposited();
  console.log("Insurance deposited = ", ethers.utils.formatUnits(insuranceDeposited, 6));

  let perpPnl = await proxy.getPnlAndPendingFee(address);
  console.log(`PERP PnL = {realized = ${ethers.utils.formatEther(perpPnl[0])}, unrealized = ${ethers.utils.formatEther(perpPnl[1])}, pendingFee = ${ethers.utils.formatEther(perpPnl[2])}}`)

  let markPriceTwap = await depository.getMarkPriceTwap("0");
  console.log(`MarkPriceTwap = ${markPriceTwap} <> ${ethers.utils.formatEther(markPriceTwap)}`)
  const positionSize = await proxy.getTotalPositionSize(address, config.contracts.PerpVETHMarket);
  console.log("Position size = ", ethers.utils.formatEther(positionSize));

  const positionValue = await depository.getPositionValue();
  console.log("Position value = ", ethers.utils.formatEther(positionValue));

  const absPositionValue = await proxy.getTotalAbsPositionValue(address);
  console.log("Abs Position value = ", ethers.utils.formatEther(absPositionValue));

  const accountValue = await depository.getAccountValue();
  console.log('Account value = ', ethers.utils.formatEther(accountValue))

  const freeCollateral = await depository.getFreeCollateral();
  console.log("Free collateral = ", ethers.utils.formatUnits(freeCollateral, 6));

  const freeUsdcCollateral = await proxy.getFreeCollateralByToken(address, config.tokens.USDC)
  console.log("Free USDC collateral = ", ethers.utils.formatUnits(freeUsdcCollateral, '6'))

  const freeEthCollateral = await proxy.getFreeCollateralByToken(address, config.tokens.WETH)
  console.log("Free ETH collateral = ", ethers.utils.formatEther(freeEthCollateral))

  // todo: Uncomment when goerli support by perp curie SDK
  const prices = await getPerpPrices("ETHUSD")
  const markPrice = prices.markPrice.toNumber();
  const indexPrice = prices.indexPrice.toNumber();
  console.log(`ETH Price [Mark = ${markPrice} | Index =${indexPrice}]`)
  const ethBalace = await proxy.getBalanceByToken(address, config.tokens.WETH);
  const ethValueAsEth = ethers.utils.formatEther(ethBalace.toString());
  const ethMarkValue = +ethValueAsEth * markPrice
  const ethIndexValue = +ethValueAsEth * indexPrice
  console.log(`Total WETH balance: ", ${ethers.utils.formatEther(ethBalace)}: [${ethMarkValue} | ${ethIndexValue}]`);

  const usdcBalance = await proxy.getBalanceByToken(address, config.tokens.USDC);
  console.log("Total USDC balance: ", ethers.utils.formatUnits(usdcBalance, '6'));

  const pnl = await depository.getUnrealizedPnl()
  console.log("Delta neutral position pnl = ", ethers.utils.formatEther(pnl))

  const uxdTotalSupply = await uxdToken.totalSupply();
  console.log("UXD total supply = ", ethers.utils.formatEther(uxdTotalSupply));
}

async function getPerpPrices(tickerSymbol: string) {
  const prices = await perp.markets
    .getMarket({ tickerSymbol })
    .getPrices();
  return prices;
}

async function setupPerp() {
    const chainId = config.settings.ChainId;
    const rpcEndpoint = `${config.settings.RpcEndpoint}${process.env.INFURA_KEY}`;
    console.log('chainId = ', chainId)
    console.log('rpcEndpoint = ', rpcEndpoint)
    perp = new PerpetualProtocol({
      chainId,
      providerConfigs: [{ rpcUrl: rpcEndpoint }],
    });
    await perp.init();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
