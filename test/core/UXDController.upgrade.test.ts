import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { UXDController } from "../../typechain-types";

describe("UXDController upgrade", () => {
  it("Can upgrade successfully", async () => {
    const ERC20 = await ethers.getContractFactory("TestERC20");
    const token = await ERC20.deploy("TestERC20", "MyToken");
    await token.deployed();

    // deploy initial contract
    const UXDController = await ethers.getContractFactory("UXDController");
    const instance = (await upgrades.deployProxy(
      UXDController,
      [token.address],
      { kind: "uups" }
    )) as UXDController;
    
    expect(await instance.VERSION()).to.equal(1);

    // upgrade to new version
    const UpgradedUXDController = await ethers.getContractFactory(
      "TestUXDControllerUpgrade"
    );
    const upgraded = await upgrades.upgradeProxy(
      instance.address,
      UpgradedUXDController
    );
    expect(instance.address).to.equal(upgraded.address);
    expect(await upgraded.VERSION()).to.equal(2);
  });
});
