import { ethers } from "hardhat";
import { ArbitrumConfig } from "../../config/configs";
import { Depositories } from "../../config/contracts";
import { checkNetwork, NetworkName } from "../common/checkNetwork";
import { loadConfig, loadCoreContracts, loadDepositories } from "../common/loaders";

async function main() {
  const hre = await import("hardhat")
  checkNetwork(hre, [NetworkName.ArbitrumGoerli, NetworkName.ArbitrumOne]);
  
  const signer = (await ethers.getSigners())[0];

  const config = await loadConfig(hre) as ArbitrumConfig;
  const coreContracts = await loadCoreContracts(hre);

  const depositories = await loadDepositories(hre) as Depositories

  const Depository = await ethers.getContractFactory("RageDnDepository");
  const depository = Depository.attach(depositories.rageTrade);

  const pnlBefore = await depository.getUnrealizedPnl();
  console.log(
    `Unrealized PnL before = ${ethers.utils.formatUnits(pnlBefore, "6")}`
  );

  const tx = await (
    await depository.withdrawProfits(
        signer.address
    )
  ).wait();
  console.log(`Withdraw profits hash is ${tx.transactionHash}`);

  const pnlAfter = await depository.getUnrealizedPnl();
  console.log(
    `Unrealized PnL after = ${ethers.utils.formatUnits(pnlAfter, "6")}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
