import chai from "chai";
import { expect } from "chai";
import { ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import {
  MockPerpAccountBalance,
  MockPerpClearingHouse,
  MockPerpVault,
  PerpAccountProxy,
} from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";

chai.use(solidity);

describe("PerpAccountProxy", async () => {
  let admin: SignerWithAddress;
  let bob: SignerWithAddress;
  let account: string;
  let market :string;
  let token: string;
  let proxy: PerpAccountProxy;
  let perpVault: MockPerpVault;
  let perpAccountBalance: MockPerpAccountBalance;
  let perpClearingHouse: MockPerpClearingHouse;

  beforeEach(async () => {
    [admin, bob] = await ethers.getSigners();
    account = bob.address;
    market = "0xdD2FD4581271e230360230F9337D5c0430Bf44C0";
    token = "0xcd3B766CCDd6AE721141F452C550Ca635964ce71";

    perpVault = await (await 
        ethers.getContractFactory("MockPerpVault")
    ).deploy() as MockPerpVault;
    await perpVault.deployed();
    perpAccountBalance = (await (
      await ethers.getContractFactory("MockPerpAccountBalance")
    ).deploy(perpVault.address)) as MockPerpAccountBalance;
    await perpAccountBalance.deployed();
    perpClearingHouse = (await (
      await ethers.getContractFactory("MockPerpClearingHouse")
    ).deploy()) as MockPerpClearingHouse;
    await perpClearingHouse.deployed();
    proxy = (await (
      await ethers.getContractFactory("PerpAccountProxy")
    ).deploy(
      perpAccountBalance.address,
      perpClearingHouse.address
    )) as PerpAccountProxy;
    await proxy.deployed();
  });

  it("reads state from external contracts", async () => {
    const defaults = {
        openNotional: ethers.utils.parseEther("1"),
        totalPositionValue: ethers.utils.parseEther("2"),
        absPositionValue: ethers.utils.parseEther("3"),
        debtValue: ethers.utils.parseEther("4"),
        totalPositionSize: 500,
        balanceByToken: ethers.utils.parseEther("5"),
        freeCollateral: ethers.utils.parseEther("6"),
        freeCollateralByToken: ethers.utils.parseEther("7"),
        pnlAndPendingFee: [BigNumber.from("8"), BigNumber.from("9"), BigNumber.from("10")],

    }
    await (await perpAccountBalance.setOpenNotional(account, market, defaults.openNotional)).wait();
    await (await perpAccountBalance.setPnlAndPendingFee(account, defaults.pnlAndPendingFee)).wait();
    await (await perpAccountBalance.setTotalDebtValue(account, defaults.debtValue)).wait();
    await (await perpAccountBalance.setTotalPositionSize(defaults.totalPositionSize)).wait();
    await (await perpAccountBalance.setTotalPositionValue(defaults.totalPositionValue)).wait();
    await (await perpAccountBalance.setTotalAbsPositionValue(account, defaults.absPositionValue)).wait();
    
    await (await perpVault.setFreeCollateral(account, defaults.freeCollateral)).wait();
    await (await perpVault.setBalanceByToken(account, token, defaults.balanceByToken)).wait();
    await (await perpVault.setFreeCollateralByToken(account, token, defaults.freeCollateralByToken)).wait();

    const openNotional = await proxy.getTotalOpenNotional(account, market);
    const pnlAndPendingFee = await proxy.getPnlAndPendingFee(account);
    const totalPositionSize = await proxy.getTotalPositionSize(account, market);
    const totalPositionValue = await proxy.getTotalPositionValue(account, market);
    const absPositionValue = await proxy.getTotalAbsPositionValue(account);
    const debtValue = await proxy.getTotalDebtValue(account);
    const freeCollateralByToken = await proxy.getFreeCollateralByToken(account, token)
    const freeCollateral = await proxy.getFreeCollateral(account)
    const balanceByToken = await proxy.getBalanceByToken(account, token);

    expect(openNotional).to.eq(defaults.openNotional);
    expect(totalPositionSize).to.eq(defaults.totalPositionSize);
    expect(totalPositionValue).to.eq(defaults.totalPositionValue);
    expect(absPositionValue).to.eq(defaults.absPositionValue);
    expect(debtValue).to.eq(defaults.debtValue);
    expect(pnlAndPendingFee[0]).to.equal(defaults.pnlAndPendingFee[0]);
    expect(pnlAndPendingFee[1]).to.equal(defaults.pnlAndPendingFee[1]);
    expect(pnlAndPendingFee[2]).to.equal(defaults.pnlAndPendingFee[2]);

    expect(freeCollateral).to.eq(defaults.freeCollateral);
    expect(freeCollateralByToken).to.eq(defaults.freeCollateralByToken);
    expect(balanceByToken).to.eq(defaults.balanceByToken);
  });
});
