import chai from "chai";
import { expect } from "chai";
import { ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import { UXDCouncilToken } from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

chai.use(solidity);

describe("UXDCouncilToken", async () => {
    let councilToken: UXDCouncilToken;
    let admin: SignerWithAddress;
    let bob: SignerWithAddress;

    beforeEach(async () => {
        [admin, bob] = await ethers.getSigners();
        councilToken = await (await ethers.getContractFactory("UXDCouncilToken")).deploy(admin.address) as UXDCouncilToken;
    });

    it("can mint", async () => {
        const initialSupply = await councilToken.totalSupply();
        const amount = ethers.utils.parseEther("2");
        await (await councilToken.mint(bob.address, amount)).wait()
        const bobBalance = await councilToken.balanceOf(bob.address);
        expect(bobBalance).to.eq(amount);
        const newSupply = await councilToken.totalSupply();
        expect(newSupply).to.eq(initialSupply.add(amount));
    });

    it("can burn", async () => {
        const amount = ethers.utils.parseEther("1");
        const oldBalance = await councilToken.balanceOf(admin.address);
        await (await councilToken.burn(amount)).wait()
        const newBalance = await councilToken.balanceOf(admin.address);
        expect(newBalance).to.eq(oldBalance.sub(amount));
    });
});
