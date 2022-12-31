import * as hre from "hardhat"

export async function verify(address: string, constructorArguments: any[] = [], contract?: string) {
    console.log(`verifying contract at ${address}`)
    hre.run("verify:verify", {
        contract,
        address,
        constructorArguments
    })
    .then(() => console.log(`Contract ${address} verfied ✅`))
    .catch(err => console.log(`Error verifying contract at [${address}]`, err))
}
