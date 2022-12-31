# UXDProtocol contest details

- Join [Sherlock Discord](https://discord.gg/MABEWyASkp)
- Submit findings using the issue page in your private contest repo (label issues as med or high)
- [Read for more details](https://docs.sherlock.xyz/audits/watsons)

# Resources

- [UXD Protocol General documentation (Gitbook)](https://app.gitbook.com/o/-MjEqYdkIaIdVxtVi5Ak/s/-Mj8VWsobdvjhMutae2g/)
- [UXD Protocol Ethereum documentation (Gitbook)](https://app.gitbook.com/o/-MjEqYdkIaIdVxtVi5Ak/s/1E6zuIkkA2VyjNzzq1dR/)
- [UXDProtocol Github](https://github.com/UXDProtocol)
- [UXD EVM repository @a3ed1e0](https://github.com/UXDProtocol/uxd-evm/tree/sherlock-audit)

# On-chain context

```
DEPLOYMENT: mainnet, arbitrum, optimism
ERC20: USDC, WETH
ERC721: none
ERC777: none
FEE-ON-TRANSFER: none
REBASING TOKENS: none
ADMIN: trusted
```

In case of restricted, by default Sherlock does not consider direct protocol rug pulls as a valid issue unless the protocol clearly describes in detail the conditions for these restrictions.
For contracts, owners, admins clearly distinguish the ones controlled by protocol vs user controlled. This helps watsons distinguish the risk factor.
Example:

- `ContractA.sol` is owned by the protocol.
- `admin` in `ContractB` is restricted to changing properties in `functionA` and should not be able to liquidate assets or affect user withdrawals in any way.
- `admin` in `ContractC` is user admin and is restricted to only `functionB`

# Audit scope

- files under `contracts/`, except the tests `contracts/tests`


# About UXDProtocol

UXD is a next-generation decentralized stablecoin that integrates with defi protocols and derivative trading exchanges in order to create vaults and "delta-neutral" positions that collateralizes the stablecoin.
