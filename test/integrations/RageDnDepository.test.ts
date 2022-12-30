import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, solidity } from "ethereum-waffle";
import { ERC20, PerpDepository, MockPerpVault, MockPerpClearingHouse,MockPerpAccountBalance, MockController  } from "../../typechain-types";
import { deployRageDnDepositoryFixture } from "../fixtures/depositoryFixture";

chai.use(solidity);

describe("RageDnDepository", async () => {
    let admin: SignerWithAddress;
    let bob: SignerWithAddress;

    beforeEach(async() => {
        const signers = await ethers.getSigners();
        [admin, bob] = signers;
    });  

    it("can deposit", async () => {
        const {depository, controller, vault, assetToken} = await loadFixture(deployRageDnDepositoryFixture);
        const assetAmount = ethers.utils.parseEther("1")
        await (await assetToken.transfer(depository.address, assetAmount)).wait();
        await (await controller.deposit(assetToken.address, assetAmount)).wait();

        const depositoryBalance = await assetToken.balanceOf(vault.address);
        const assetDeposited = await depository.netAssetDeposits();

        expect(depositoryBalance).to.equal(assetAmount);
        expect(assetDeposited).to.equal(assetAmount);
    });

    it("can redeem", async () => {
        const {depository, controller, vault, assetToken} = await loadFixture(deployRageDnDepositoryFixture);
        const assetAmount = ethers.utils.parseEther("1")

        const vaultBaseBalanceBefore = await assetToken.balanceOf(vault.address);
        const collateralDepositedBefore = await depository.netAssetDeposits();

        await (await assetToken.transfer(depository.address, assetAmount)).wait();
        await (await controller.deposit(assetToken.address, assetAmount)).wait();
        await (await controller.withdraw(assetToken.address, assetAmount, bob.address)).wait();

        const vaultBaseBalanceAfter = await assetToken.balanceOf(vault.address);
        const bobBalance = await assetToken.balanceOf(bob.address);
        const collateralDepositedAfter = await depository.netAssetDeposits();

        expect(vaultBaseBalanceBefore).to.equal(vaultBaseBalanceAfter);
        expect(collateralDepositedBefore).to.equal(collateralDepositedAfter);
        expect(bobBalance).to.equal(assetAmount);
    });

    it("can withdraw profits", async() => {
        const {depository, vault, assetToken} = await loadFixture(deployRageDnDepositoryFixture);
        let realizedProfits = await depository.realizedPnl();
        expect(realizedProfits).to.eq(0);
        const profit = ethers.utils.parseEther("10");
        
        await (await assetToken.approve(vault.address, profit)).wait();
        await (await vault.addProfits(profit)).wait()
        const bobBalanceBefore = await assetToken.balanceOf(bob.address);
        await depository.withdrawProfits(bob.address);
        realizedProfits = await depository.realizedPnl();
        expect(realizedProfits).to.gt(0);
        const bobBalanceAfter = await assetToken.balanceOf(bob.address);
        expect(bobBalanceAfter).to.eq(bobBalanceBefore.add(profit));
    })

    it("Can set redeemable soft cap", async() => {
        const {depository, controller, assetToken} = await loadFixture(deployRageDnDepositoryFixture);
        const amount = ethers.utils.parseEther("100.0")
        const softCap = ethers.utils.parseEther("10");
        await (await assetToken.transfer(depository.address, amount)).wait();
        await (await depository.setRedeemableSoftCap(softCap)).wait();
        await expect(controller.deposit(assetToken.address, amount)).to.be.reverted;
    });

    it("can transfer ownership", async() => {
        const {depository} = await loadFixture(deployRageDnDepositoryFixture);
        const owner = await depository.owner();
        expect(owner).to.eq(admin.address);
        await (await depository.transferOwnership(bob.address)).wait();
        let newOwner = await depository.owner();
        expect(newOwner).to.eq(bob.address);
    })

    it("has a version", async() => {
        const {depository} = await loadFixture(deployRageDnDepositoryFixture);
        const version = await depository.VERSION();
        expect(version).to.eq(1);
    })
});
