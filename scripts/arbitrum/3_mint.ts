import { ethers } from "hardhat";
import { ArbitrumConfig } from "../../config/configs";
import { checkNetwork, NetworkName } from "../common/checkNetwork";
import { loadConfig, loadCoreContracts } from "../common/loaders";

async function main() {
  const hre = await import("hardhat")
  checkNetwork(hre, [NetworkName.ArbitrumGoerli, NetworkName.ArbitrumOne]);
  
  const signer = (await ethers.getSigners())[0];
  const contracts = await loadCoreContracts(hre);
  const config = await loadConfig(hre) as ArbitrumConfig;

  const Controller = await ethers.getContractFactory("UXDController");
  const controller = Controller.attach(contracts.controller);

  const UXDToken = await ethers.getContractFactory("UXDToken");
  const token = UXDToken.attach(contracts.uxd);

  const spendAmount = ethers.utils.parseUnits("10.0", "6");
  const USDC = await ethers.getContractFactory("TestERC20");
  const usdc = USDC.attach(config.tokens.USDC);
  await (await usdc.approve(contracts.controller, spendAmount)).wait();
  console.log("Controller approved");

  let totalSupply = await token.totalSupply();
  console.log(
    `UXD total supply = ${ethers.utils.formatEther(totalSupply)}`
  );

  const tx = await (
    await controller.mint(config.tokens.USDC, spendAmount, 0, signer.address)
  ).wait();
  console.log(`Deposit hash is ${tx.transactionHash}`);

  totalSupply = await token.totalSupply();
  console.log(
    `UXD total supply = ${ethers.utils.formatEther(totalSupply)}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
