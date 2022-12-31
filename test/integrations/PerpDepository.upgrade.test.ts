import {expect} from "chai";
import { loadFixture } from "ethereum-waffle";
import { ethers, upgrades } from "hardhat";
import { PerpDepository, UXDController } from "../../typechain-types";
import { deployPerpDepositoryFixture } from "../fixtures/depositoryFixture";

describe("PerpDepositoryUpgrade", () => {
    it("Can upgrade successfully", async () => {
        const [admin] = await ethers.getSigners();
        const {depository} = await loadFixture(deployPerpDepositoryFixture);

        expect(await depository.VERSION()).to.equal(1);

        // upgrade to new version
        const UpgradedPerpDepository = await ethers.getContractFactory("TestPerpDepositoryUpgrade");
        const upgraded = await upgrades.upgradeProxy(depository.address, UpgradedPerpDepository);
        expect(depository.address).to.equal(upgraded.address);
        expect(await upgraded.VERSION()).to.equal(2);
    });
});
