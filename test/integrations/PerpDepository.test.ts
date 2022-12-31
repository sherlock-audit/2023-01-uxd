import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, solidity } from "ethereum-waffle";
import { ERC20, PerpDepository, MockPerpVault, MockPerpClearingHouse,MockPerpAccountBalance, MockController  } from "../../typechain-types";
import { deployPerpDepositoryFixture } from "../fixtures/depositoryFixture";
import { DepositoryStateStruct } from "../../typechain-types/contracts/test/TestPerpDepositoryUpgrade";

chai.use(solidity);

describe("PerpDepository", async () => {
    let admin: SignerWithAddress;
    let bob: SignerWithAddress;

    beforeEach(async() => {
        const signers = await ethers.getSigners();
        [admin, bob] = signers;
    });  

    it("has an initial state", async() => {
        const {depository, vault, quoteToken} = await loadFixture(deployPerpDepositoryFixture)
        const owner = await depository.owner();
        expect(owner).to.eq(admin.address);
        const freeCollateral = await depository.getFreeCollateral();
        expect(freeCollateral).to.eq(0);
        const markPriceTwap = await depository.getMarkPriceTwap(0);
        const exchangeFee = await depository.getExchangeFeeWad()
    });

    it("can deposit insurance", async () => {
        const {depository, vault, quoteToken} = await loadFixture(deployPerpDepositoryFixture)
        const insuranceAmount = ethers.utils.parseEther("1");
        await (await quoteToken.approve(depository.address, insuranceAmount)).wait();
        await (await depository.depositInsurance(insuranceAmount, admin.address)).wait();
        const depositoryBalance = await quoteToken.balanceOf(vault.address);
        const insuranceDeposited = await depository.insuranceDeposited();

        expect(depositoryBalance).to.equal(insuranceAmount);
        expect(insuranceDeposited).to.equal(insuranceAmount);
    });

    it("can withdraw insurance", async () => {
        const {depository, vault, quoteToken} = await loadFixture(deployPerpDepositoryFixture);

        const insuranceAmount = ethers.utils.parseEther("1");
        await (await quoteToken.approve(depository.address, insuranceAmount)).wait();
        const insuranceDepositedBefore = await depository.insuranceDeposited();

        await (await depository.depositInsurance(insuranceAmount, admin.address)).wait();
        await (await depository.withdrawInsurance(insuranceAmount, bob.address)).wait();

        const bobBalance = await quoteToken.balanceOf(bob.address);
        const insuranceDepositedAfter = await depository.insuranceDeposited();

        expect(insuranceDepositedBefore).to.equal(insuranceDepositedAfter);
        expect(bobBalance).to.equal(insuranceAmount);
    });

    it("can deposit", async () => {
        const {depository, controller, vault, baseToken} = await loadFixture(deployPerpDepositoryFixture);
        const collateralAmount = ethers.utils.parseEther("1")
        await (await baseToken.transfer(depository.address, collateralAmount)).wait();
        await (await controller.deposit(baseToken.address, collateralAmount)).wait();

        const depositoryBalance = await baseToken.balanceOf(vault.address);
        const collateralDeposited = await depository.netAssetDeposits();
        
        const accountValue = await depository.getAccountValue();
        expect(accountValue).to.not.eq(0)

        expect(depositoryBalance).to.equal(collateralAmount);
        expect(collateralDeposited).to.equal(collateralAmount);
    });

    it("can withdraw collateral", async () => {
        const {depository, controller, vault, baseToken} = await loadFixture(deployPerpDepositoryFixture);
        const collateralAmount = ethers.utils.parseEther("1")

        const vaultBaseBalanceBefore = await baseToken.balanceOf(vault.address);
        const collateralDepositedBefore = await depository.netAssetDeposits();

        await (await baseToken.transfer(depository.address, collateralAmount)).wait();
        await (await controller.deposit(baseToken.address, collateralAmount)).wait();
        await (await controller.withdraw(baseToken.address, collateralAmount, bob.address)).wait();

        const vaultBaseBalanceAfter = await baseToken.balanceOf(vault.address);
        const bobBalance = await baseToken.balanceOf(bob.address);
        const collateralDepositedAfter = await depository.netAssetDeposits();

        expect(vaultBaseBalanceBefore).to.equal(vaultBaseBalanceAfter);
        expect(collateralDepositedBefore).to.equal(collateralDepositedAfter);
        expect(bobBalance).to.equal(collateralAmount);
    });

    it("Can set redeemable soft cap", async() => {
        const {depository, controller, baseToken} = await loadFixture(deployPerpDepositoryFixture);
        const amount = ethers.utils.parseEther("100.0")
        const softCap = ethers.utils.parseEther("10");
        await (await baseToken.transfer(depository.address, amount)).wait();
        await (await depository.setRedeemableSoftCap(softCap)).wait();
        await expect(controller.deposit(baseToken.address, amount)).to.be.reverted;
    });

    it("can transfer ownership", async() => {
        const {depository} = await loadFixture(deployPerpDepositoryFixture);
        const owner = await depository.owner();
        expect(owner).to.eq(admin.address);
        await (await depository.transferOwnership(bob.address)).wait();
        let newOwner = await depository.owner();
        expect(newOwner).to.eq(bob.address);

        await (await depository.connect(bob).transferOwnership(admin.address)).wait();
    })

    it("has the right version", async() => {
        const {depository} = await loadFixture(deployPerpDepositoryFixture);
        const version = await depository.VERSION();
        expect(version).to.eq(1);
    })

    it("has a fee", async() => {
        const {depository} = await loadFixture(deployPerpDepositoryFixture);
        const fee = await depository.getExchangeFee();
        expect(fee).to.not.eq(0);
    })

    it("can get the debt value", async() => {
        const {depository} = await loadFixture(deployPerpDepositoryFixture);
        const debtValue = await depository.getDebtValue(depository.address);
        expect(debtValue).to.not.eq(0);
    })

    it("has a current state", async() => {
        const {depository, controller, baseToken} = await loadFixture(deployPerpDepositoryFixture);
        const assetAmount = ethers.utils.parseEther("1")
        const redeemableSoftCap = ethers.utils.parseEther("10000")
        const redeemableUnderManagement = ethers.utils.parseEther("1")

        await (await depository.setRedeemableSoftCap(redeemableSoftCap)).wait();
        await (await baseToken.transfer(depository.address, assetAmount)).wait();
        await (await controller.deposit(baseToken.address, assetAmount)).wait();

        const state: DepositoryStateStruct = await depository.getCurrentState();
        expect(state.redeemableSoftCap).to.eq(redeemableSoftCap);
    });

});
