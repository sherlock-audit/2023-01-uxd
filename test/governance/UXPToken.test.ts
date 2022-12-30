import chai from "chai";
import { expect } from "chai";
import { ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import { UXPToken } from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

chai.use(solidity);

describe("UXPToken", async () => {
    let uxp: UXPToken;
    let admin: SignerWithAddress;
    let bob: SignerWithAddress;

    beforeEach(async () => {
        [admin, bob] = await ethers.getSigners();
        const initialSupply = ethers.utils.parseEther("1000");
        uxp = await (await ethers.getContractFactory("UXPToken")).deploy(admin.address, initialSupply, ethers.constants.AddressZero) as UXPToken;
    });

    it("can mint", async () => {
        const initialSupply = await uxp.totalSupply();
        const amount = ethers.utils.parseEther("2");
        await (await uxp.mint(bob.address, amount)).wait()
        const bobBalance = await uxp.balanceOf(bob.address);
        expect(bobBalance).to.eq(amount);
        const newSupply = await uxp.totalSupply();
        expect(newSupply).to.eq(initialSupply.add(amount));
    });

    it("can burn", async () => {
        const amount = ethers.utils.parseEther("1");
        const oldBalance = await uxp.balanceOf(admin.address);
        await (await uxp.burn(admin.address, amount)).wait();
        
        const newBalance = await uxp.balanceOf(admin.address);
        expect(newBalance).to.eq(oldBalance.sub(amount));
        
        // requires approval to burn from other account
        await (await uxp.mint(bob.address, amount)).wait();
        const bobOldBalance = await uxp.balanceOf(bob.address);
        await expect(uxp.burn(bob.address, amount)).to.be.revertedWith("ERC20: insufficient allowance");
        await (await uxp.connect(bob).approve(admin.address, amount)).wait();
        await (await uxp.burn(bob.address, amount)).wait();
        const bobNewBalance = await uxp.balanceOf(bob.address);
        expect(bobNewBalance).to.eq(bobOldBalance.sub(amount));
    });
});
