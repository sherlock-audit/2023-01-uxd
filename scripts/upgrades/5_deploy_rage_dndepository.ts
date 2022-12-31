import { network, ethers, upgrades } from "hardhat";
import "@nomiclabs/hardhat-etherscan";
import fs from "fs";
import { Depositories } from "../../config/contracts";
import { loadDepositories } from "../common/loaders";
import { verify } from "../common/verify";
import { checkNetwork, NetworkName } from "../common/checkNetwork";

// global consts and vars
let depositoryAddress: any;
let depositories: Depositories;

async function main() {
  const hre = await import("hardhat");
  checkNetwork(hre, [NetworkName.ArbitrumGoerli, NetworkName.ArbitrumOne]);

  // We get the contract to deploy
  depositories = await loadDepositories(hre);

  await deployContracts();
  await verifyContracts();
  await save();
}

async function deployContracts() {
  console.log(">>> Deploying contracts...")

  console.log("1 - ready to deploy depository");
  const RageDnDepository = await ethers.getContractFactory("RageDnDepository");
  depositoryAddress = await upgrades.prepareUpgrade(
    depositories.rageTrade!, 
    RageDnDepository, 
    {kind: "uups", unsafeAllowRenames: true}
  );
  console.log(`RageDnDepository deployed to ${depositoryAddress} ✅`);
}

async function verifyContracts() {
  console.log(">>> Verifying contracts...")

  console.log(`> Verifying depositoryImpl: ${depositoryAddress}`)
  await verify(depositoryAddress)
  console.log("Contract verification done ✅")
}

async function save() {
    const config = `
    {
        "depositoryImpl": "${depositoryAddress}"
    }
    `;
    const folderPath = `./addresses/${network.name}`;
    fs.mkdirSync(folderPath, { recursive: true });
    const data = JSON.stringify(config);
    const filename = `${folderPath}/rage_depository_impl.json`;
    fs.writeFileSync(filename, JSON.parse(data));
    console.log(`Address ${depositoryAddress} written to file: ${filename}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
