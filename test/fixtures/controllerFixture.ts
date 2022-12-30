import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, upgrades } from "hardhat";
import { TestDepository, TestERC20, TestWETH9, UXDController, UXDRouter } from "../../typechain-types";

export async function controllerFixture() {
    const signers = await ethers.getSigners();
    let admin: SignerWithAddress;
    [admin] = signers;

    const weth = await (await ethers.getContractFactory("TestWETH9")).deploy() as TestWETH9;
    await weth.deployed();

    const redeemable = await (await ethers.getContractFactory("TestERC20")).deploy("Redeemable", "RED") as TestERC20;
    const asset = await (await ethers.getContractFactory("TestERC20")).deploy("Asset", "ASS") as TestERC20;

    const UXDController = await ethers.getContractFactory("UXDController")
    const controller = await upgrades.deployProxy(UXDController, [weth.address]) as UXDController;

    const router = await (await ethers.getContractFactory("UXDRouter")).deploy() as UXDRouter;
    const depository = await (await ethers.getContractFactory("TestDepository")).deploy() as TestDepository;

    await (await router.registerDepository(depository.address, asset.address)).wait();
    await (await router.registerDepository(depository.address, weth.address)).wait();
    await (await controller.whitelistAsset(asset.address, true)).wait();
    await (await controller.whitelistAsset(weth.address, true)).wait();
    await (await controller.updateRouter(router.address)).wait();
    await (await controller.setRedeemable(redeemable.address)).wait();

    const transferAmount = ethers.utils.parseEther("100");
    await (await asset.transfer(controller.address, transferAmount)).wait();

    await (await weth.deposit({value: transferAmount})).wait();
    await (await (weth.transfer(controller.address, transferAmount))).wait()

    return {controller, router, depository, weth, asset, redeemable};
}