import chai from "chai";
import { expect } from "chai";
import { ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import { ERC20, UXDCouncilToken, UXDGovernor, UXDTimelockController } from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

chai.use(solidity);

describe("UXDTimelockController", async () => {
  let governor: UXDGovernor;
  let token: ERC20;
  let governanceToken: UXDCouncilToken;
  let timelock: UXDTimelockController;
  let admin: SignerWithAddress;
  let bob: SignerWithAddress;
  const governorParams = {
    votingDelay: 0,
    votingPeriod: 1,
    proposalThreshold: 1,
    quorumFraction: 10,
  };

  beforeEach(async () => {
    [admin, bob] = await ethers.getSigners();
    const minDelay = 0; // seconds
    const proposers: string[] = [];
    const executors: string[] = [];

    governanceToken = await (await ethers.getContractFactory("UXDCouncilToken")).deploy(admin.address) as UXDCouncilToken;
    await governanceToken.deployed();

    token = await (await ethers.getContractFactory("TestERC20")).deploy("Token", "TOK") as ERC20;
    await token.deployed();

    const UXDTimeLockController = await ethers.getContractFactory(
      "UXDTimelockController"
    );
    timelock = (await UXDTimeLockController.deploy(
      minDelay,
      proposers,
      executors
    )) as UXDTimelockController;
    await timelock.deployed();

    governor = (await (
      await ethers.getContractFactory("UXDGovernor")
    ).deploy(
      governanceToken.address,
      timelock.address,
      governorParams,
    )) as UXDGovernor;
    await governor.deployed();
    await (await governanceToken.delegate(admin.address)).wait();
    const proposerRole = await timelock.PROPOSER_ROLE();
    const execRole = await timelock.EXECUTOR_ROLE();
    await (await timelock.grantRole(proposerRole, governor.address)).wait();
    await (await timelock.grantRole(execRole, governor.address)).wait();
  });

  it("reverts if approve fails", async() => {
    const amount = ethers.utils.parseEther("1000");
    
    await (await token.transfer(timelock.address, amount)).wait();

    const proposalDescription = "approve erc20 for zero address"
    const descriptionHash = ethers.utils.id(proposalDescription);
    const callData = timelock.interface.encodeFunctionData(
        "approveERC20", 
        [
            token.address,
            ethers.constants.AddressZero, 
            amount
        ]
    )

    const tx = await (
        await governor.propose(
            [timelock.address],
            [0],
            [callData],
            proposalDescription
        )
        ).wait();
    const proposalId = await governor.hashProposal([timelock.address], [0], [callData], descriptionHash);
    await (await governor.castVote(proposalId, 1)).wait();
    await (await governor.queue([timelock.address], [0], [callData], descriptionHash)).wait();
    await expect(governor.execute([timelock.address], [0], [callData], descriptionHash)).to.be.reverted;
  })

  it("can approve token transfers", async() => {
    const amount = ethers.utils.parseEther("1000");
    await (await token.transfer(timelock.address, amount)).wait();

    const proposalDescription = "approve erc20"
    const descriptionHash = ethers.utils.id(proposalDescription);
    const callData = timelock.interface.encodeFunctionData(
        "approveERC20", 
        [
            token.address,
            admin.address, 
            amount
        ]
    )

    const tx = await (
        await governor.propose(
            [timelock.address],
            [0],
            [callData],
            proposalDescription
        )
        ).wait();
    const proposalId = await governor.hashProposal([timelock.address], [0], [callData], descriptionHash);
    await (await governor.castVote(proposalId, 1)).wait();
    await (await governor.queue([timelock.address], [0], [callData], descriptionHash)).wait();
    await (await governor.execute([timelock.address], [0], [callData], descriptionHash)).wait();

    const allowance = await token.allowance(timelock.address, admin.address);
    expect(allowance).to.eq(amount);
  });

  it("can transfer erc20 tokens", async() => {
    const amount = ethers.utils.parseEther("1000");
    await (await token.transfer(timelock.address, amount)).wait();

    const proposalDescription = "approve erc20"
    const descriptionHash = ethers.utils.id(proposalDescription);
    const callData = timelock.interface.encodeFunctionData(
        "transferERC20", 
        [
            token.address,
            bob.address, 
            amount
        ]
    )

    const tx = await (
        await governor.propose(
            [timelock.address],
            [0],
            [callData],
            proposalDescription
        )
        ).wait();
    const proposalId = await governor.hashProposal([timelock.address], [0], [callData], descriptionHash);
    const bobBalanceBefore = await token.balanceOf(bob.address);
    await (await governor.castVote(proposalId, 1)).wait();
    await (await governor.queue([timelock.address], [0], [callData], descriptionHash)).wait();
    await (await governor.execute([timelock.address], [0], [callData], descriptionHash)).wait();
    const bobBalanceAfter = await token.balanceOf(bob.address);

    expect(bobBalanceAfter).to.eq(bobBalanceBefore.add(amount));
  });

  it("can transfer eth", async() => {
    const amount = ethers.utils.parseEther("1");
    await (await admin.sendTransaction({
        to: timelock.address,
        value: ethers.utils.parseEther("1.0")
    })).wait();

    const proposalDescription = "transfer eth"
    const descriptionHash = ethers.utils.id(proposalDescription);
    const callData = timelock.interface.encodeFunctionData(
        "transferETH", 
        [
            bob.address, 
            amount
        ]
    )

    const tx = await (
        await governor.propose(
            [timelock.address],
            [0],
            [callData],
            proposalDescription
        )
        ).wait();
    const proposalId = await governor.hashProposal([timelock.address], [0], [callData], descriptionHash);
    const bobBalanceBefore = await bob.getBalance();
    await (await governor.castVote(proposalId, 1)).wait();
    await (await governor.queue([timelock.address], [0], [callData], descriptionHash)).wait();
    await (await governor.execute([timelock.address], [0], [callData], descriptionHash)).wait();
    const bobBalanceAfter = await bob.getBalance()

    expect(bobBalanceAfter).to.eq(bobBalanceBefore.add(amount));
  });
});
