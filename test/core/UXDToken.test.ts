import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";

describe("UXDToken", function () {
  let token: Contract;
  let controller: SignerWithAddress;
  let bob: SignerWithAddress;
  let alice: SignerWithAddress;
  const globalSupplyCap = ethers.utils.parseEther("1000");

  beforeEach(async () => {
    // deploy XD Token and set controller to first signer
    const signers = await ethers.getSigners();
    [controller, bob, alice] = signers;
    const totalSupply = "0";
    const UXDToken = await ethers.getContractFactory("UXDToken");
    token = await UXDToken.deploy(controller.address, ethers.constants.AddressZero);
    await token.deployed();

    await token.setLocalMintCap(globalSupplyCap);
  });

  it("Can mint tokens", async function () {
    // mints 1000 tokens correctly
    const mintAmount = ethers.utils.parseEther("1000");
    const mintTx = await token.connect(controller).mint(bob.address, mintAmount);
    await mintTx.wait();

    // check total supply
    let totalSupply = await token.totalSupply();
    expect(totalSupply).to.equal(mintAmount);

    // check balance is updated
    const bobBalance = await token.balanceOf(bob.address);
    expect(bobBalance).to.equal(totalSupply);
  });

  it("Can burn tokens", async () => {
     // mints 1000 tokens correctly
    const mintAmount = ethers.utils.parseEther("1000");
    await (await token.connect(controller).mint(bob.address, mintAmount)).wait();

    const burnAmount = mintAmount.div(2);
    await (await token.connect(bob).approve(controller.address, burnAmount)).wait();
    await (await token.connect(controller).burn(bob.address, burnAmount)).wait();

    const totalSupply = await token.totalSupply();
    expect(totalSupply).to.equal(mintAmount.sub(burnAmount));

    const bobBalance = await token.balanceOf(bob.address);
    expect(bobBalance).to.equal(mintAmount.sub(burnAmount));
  })

  it("Can transfer tokens", async () => {
    const mintAmount = ethers.utils.parseEther("1000");
    const mintTx = await token.connect(controller).mint(bob.address, mintAmount);
    await mintTx.wait();

    const transferAmount = mintAmount.div(4);
    const remainingAmount = mintAmount.sub(transferAmount);

    await (await token.connect(bob).transfer(alice.address, transferAmount)).wait();
    // alice balance should be updated
    const aliceBalance = await token.balanceOf(alice.address);
    expect(aliceBalance).to.equal(transferAmount);

    const bobBalance = await token.balanceOf(bob.address);
    expect(bobBalance).to.equal(remainingAmount);
  });

  it("Can approve transfer from another user", async() => {
    const mintAmount = ethers.utils.parseEther("1000");
    const mintTx = await token.connect(controller).mint(bob.address, mintAmount);
    await mintTx.wait();

    const transferAmount = mintAmount.div(4);
    const remainingAmount = mintAmount.sub(transferAmount);

    await (await token.connect(bob).approve(controller.address, transferAmount)).wait();
    await (await token.connect(controller).transferFrom(bob.address, alice.address, transferAmount)).wait();

    const aliceBalance = await token.balanceOf(alice.address);
    expect(aliceBalance).to.equal(transferAmount);

    const bobBalance = await token.balanceOf(bob.address);
    expect(bobBalance).to.equal(remainingAmount); 
  })
});
