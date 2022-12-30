import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { upgrades } from "hardhat"
import { ethers } from "hardhat";
import { PerpDepository, MockPerpVault, MockPerpClearingHouse,MockPerpAccountBalance, MockController, RageDnDepository, MockRageSeniorVault  } from "../../typechain-types";


export async function deployPerpDepositoryFixture() {
    const signers = await ethers.getSigners();
    let admin: SignerWithAddress;
    [admin] = signers;

    const TestERC20 = await ethers.getContractFactory("TestERC20");

    let redeemable = await TestERC20.deploy("Redeemable", "RED");
    await redeemable.deployed();

    let controller = await (await ethers.getContractFactory("MockController")).deploy() as MockController
    await (await controller.setRedeemable(redeemable.address)).wait();

    const Vault = await ethers.getContractFactory("MockPerpVault");
    let vault = await Vault.deploy() as MockPerpVault;
    await vault.deployed();

    const AccountBalance = await ethers.getContractFactory("MockPerpAccountBalance");
    let accountBalance = await AccountBalance.deploy(vault.address) as MockPerpAccountBalance;
    await accountBalance.deployed();

    const Exchange = await ethers.getContractFactory("MockPerpExchange");
    let exchange = await Exchange.deploy();
    await exchange.deployed();

    const ClearingHouse = await ethers.getContractFactory("MockPerpClearingHouse");
    let clearingHouse = await ClearingHouse.deploy() as MockPerpClearingHouse;
    await clearingHouse.deployed();

    await (await clearingHouse.setAccountBalance(accountBalance.address)).wait();
    await (await clearingHouse.setExchange(exchange.address)).wait();

    const MarketRegistry = await ethers.getContractFactory("MockPerpMarketRegistry")
    const marketRegistry = await MarketRegistry.deploy();
    await marketRegistry.deployed();

    const TestContract = await ethers.getContractFactory("TestContract");
    const market = await TestContract.deploy();
    await market.deployed();

    let quoteToken = await TestERC20.deploy("Quote", "QTE");
    await quoteToken.deployed();

    let baseToken = await TestERC20.deploy("Collateral", "COL");
    await baseToken.deployed();

    const router = admin;

    const Depository = await ethers.getContractFactory("PerpDepository");
    let depository = await upgrades.deployProxy(Depository, [
        vault.address,
        clearingHouse.address,
        marketRegistry.address,
        market.address,
        baseToken.address,
        quoteToken.address,
        controller.address
    ],
    {kind: "uups"}) as PerpDepository;
    await depository.deployed();

    await (await controller.updateDepository(depository.address)).wait()
    await (await depository.setRedeemableSoftCap(ethers.utils.parseEther("1000000"))).wait();
    console.log("******depositoryFixture created")

    return {controller, vault, depository, quoteToken, baseToken, accountBalance};
}

export async function deployRageDnDepositoryFixture() {
    const TestERC20 = await ethers.getContractFactory("TestERC20");

    let assetToken = await TestERC20.deploy("Asset", "ASS");
    await assetToken.deployed();
    let redeemable = await TestERC20.deploy("Redeemable", "RED");
    await redeemable.deployed();

    let vault = await(await ethers.getContractFactory("MockRageSeniorVault")).deploy() as MockRageSeniorVault;
    await (await vault.initialize(assetToken.address)).wait();
    let controller = await(await ethers.getContractFactory("MockController")).deploy();
    await (await controller.setRedeemable(redeemable.address)).wait();
    const Depository = await ethers.getContractFactory("RageDnDepository");
    let depository = await upgrades.deployProxy(Depository, [
        vault.address,
        controller.address,
    ],
    {kind: "uups"}) as RageDnDepository;
    await depository.deployed();

    await (await vault.setDepository(depository.address)).wait();
    await (await controller.updateDepository(depository.address)).wait()
    await (await depository.setRedeemableSoftCap(ethers.utils.parseEther("1000000"))).wait();

    return {
        controller, 
        vault, 
        depository, 
        assetToken
    };
}
