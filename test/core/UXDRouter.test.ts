import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import { TestDepository } from "../../typechain-types";

chai.use(solidity);

describe("UXDRouter", async () => {
    let router: Contract;
    let depository: Contract;
    const amount = ethers.utils.parseEther("1.0")

    const market = "0x0000000000000000000000000000000000000042";
    const market1 = "0xBcd4042DE499D14e55001CcbB24a551F3b954096";
    const market2 = "0x71bE63f3384f5fb98995898A86B02Fb2426c5788";
    const asset1 = "0xFABB0ac9d68B0B445fB7357272Ff202C5651694a";
    const asset2 = "0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec"
    const insurance = "0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097";

    let depMarket1Coll1: TestDepository;
    let depMarket1Coll2: TestDepository;
    let depMarket2Coll1: TestDepository;
    let depMarket2Coll2: TestDepository;

    beforeEach(async() => {
        const Router = await ethers.getContractFactory("UXDRouter");
        router = await Router.deploy();
        await router.deployed();

        const Depository = await ethers.getContractFactory("TestDepository");

        depository = await Depository.deploy() as TestDepository;
        await depository.initialize(market1, asset1);
        await depository.deployed();

        depMarket1Coll1 = await Depository.deploy() as TestDepository;
        await depMarket1Coll1.initialize(market1, asset1);
        await depMarket1Coll1.deployed();

        depMarket1Coll2 = await Depository.deploy() as TestDepository;
        await depMarket1Coll2.initialize(market1, asset2);
        await depMarket1Coll2.deployed();

        depMarket2Coll1 = await Depository.deploy() as TestDepository;
        await depMarket2Coll1.initialize(market2, asset1);
        await depMarket2Coll1.deployed();

        depMarket2Coll2 = await Depository.deploy() as TestDepository;
        await depMarket2Coll2.initialize(market2, asset2);
        await depMarket2Coll2.deployed();
    });

    it("can register depositories", async () => {
        // await (await router.registerDepository(perpMnemonic, depository.address)).wait();
        await (await router.registerDepository(depMarket1Coll1.address, asset1)).wait();
        await (await router.registerDepository(depMarket1Coll2.address, asset1)).wait();
        await (await router.registerDepository(depMarket2Coll1.address, asset2)).wait();
        await (await router.registerDepository(depMarket2Coll2.address, asset2)).wait();

        const depositoryAddress =  await router.findDepositoryForDeposit(asset1, amount); // from depository
        expect(depositoryAddress).to.equal(depMarket1Coll1.address);

        const perpDepositories = await router.depositoriesForAsset(asset1);
        expect(perpDepositories.length).to.equal(2);
        expect(perpDepositories[0]).to.equal(depMarket1Coll1.address);
        expect(perpDepositories[1]).to.equal(depMarket1Coll2.address);

        const seiDepositories = await router.depositoriesForAsset(asset2);
        expect(seiDepositories.length).to.equal(2);
        expect(seiDepositories[0]).to.equal(depMarket2Coll1.address);
        expect(seiDepositories[1]).to.equal(depMarket2Coll2.address);
    });

    it("can unregister depository", async () => {
        await (await router.registerDepository(depository.address, asset1)).wait();
        const depositoryAddress = await router.findDepositoryForDeposit(asset1, 0);
        expect(depositoryAddress).to.equal(depository.address);

        await (await router.unregisterDepository(depository.address, asset1)).wait();

        await expect(router.findDepositoryForDeposit(market, 0)).to.be.reverted;
    });

    it("fails if registering duplicate depository", async () => {
        await (await router.registerDepository(depository.address, asset1)).wait();
        await expect(router.registerDepository(depository.address, asset1)).to.be.reverted;
    })

    it("fails if unregistering unregistered depository", async () => {
        await expect(router.unregisterDepository(depository.address, asset1)).to.be.reverted;
        // await (await router.registerDepository(depMarket1Coll1.address, asset1)).wait();
        // await expect(router.unregisterDepository(depMarket1Coll1.address, asset1)).to.be.reverted;
    })
});