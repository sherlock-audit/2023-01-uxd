# UXD ETHEREUM

This repository contains the smart contracts that implement the UXD protocol on Ethereum and EVM compatible chains.
Contracts are written in Solidity and deployed using the Hardhat development environment.

## Coding Conventions
The coding style should follow the official [solidity style guide](https://docs.soliditylang.org/en/v0.8.16/style-guide.html).

## Setup
To set up the project, you must first install the dependencies using npm.
```
npm i
```

### Compile the contracts
To compile the contracts, run:

```
npx hardhat compile
```

### Environment Variables
Private keys, Etherscan and Alchemy API keys are needed to run the scripts to interact with the contracts.
These are defined in environment variables in the `.env` file. An example of this file can be found in `.env.example`. 
Copy this file then replace the values with your own:

```
cp ./.env.example .env
```

## Scripts

The hardhat scripts under the `./scripts` folder can be used to deploy the contracts to a test or live network.
Check the `hardhat.config.ts` file for the list and names of available networks. 
End to end workflows and tests can only be run on one of the live networks as they integrate with external contracts deployed to those networks.

> Note: The scripts under the `./scripts/optimism/` folder are only intended to be run on Optimism (mainnet or goerli). Likewise scripts under `./scripts/arbitrum` are used to deploy the contracts to Arbitrum (mainnet and testnet).

### Deployment and Contract Configuration

To deploy the core contracts:
```
npx hardhat run ./scripts/optimism/1_deploy_core.ts --network optimismgoerli
npx hardhat run ./scripts/optimism/2_deploy_perp_depository.ts --network optimismgoerli
```
These scripts also initialize the contracts to a state where they are ready for interaction by users.

> Note: The default owner of the contracts is the deployer address. This account is used to call restricted functions to set up the contracts for use. After initialization, ownership must be transferred to the governance contracts.

### Minting and redeeming UXD
There are additional scripts which can be used to mint and redeem UXD.
For example, to mint UXD on optimism goerli network with WETH as collateral, run:
```
npx hardhat run ./scripts/optimism/4_mint.ts --network optimismgoerli
```

> The caller's account must have enough collateral (WETH or USDC) to mint.

To redeem UXD for USDC on the Arbitrum Goerli testnet:
```
npx hardhat run ./scripts/arbitrum/4_redeem.ts --network arbitrumgoerli
```
> The caller's account must have enough UXD to redeem.

### Governance
Scripts relating to governance functions are found under the [Governance folder](https://github.com/UXDProtocol/uxd-evm/tree/develop/scripts/governance).

#### Deploying Governance Contracts
The default contract owner, which is the deployer addrss is used to set up the contracts in development and testing environments. For DevNet and Live environments, governance contracts must be deployed and ownership of `UXDController`, `PerpDepository`, `UXPToken` and `UXDCouncilToken` contracts transferred to the `UXDTimelockController` instance.

There are two models for governance:
1. Governance Council: Voting power is through the `UXDCouncilToken`.
2. Public Governance: This is intended to be later in the product lifecycle, where public votes determine the protocol direction. Voting power here is through the `UXPToken`.

Both models use the same governance structure. The only differnce being the governance token.

To deploy the UXD Council token governance, run:

```
npx hardhat run ./scripts/governance/1_deploy_governance_council.ts --network optimismgoerli
```

To deploy the public UXP token governance, run:

```
npx hardhat run ./scripts/governance/1_deploy_governance_public.ts --network optimismgoerli
```

> In DevNet and MainNet, contract ownership must be transferred to the appropriate governance contracts.

To transfer ownership to the governance council contracts:

```
npx hardhat run ./scripts/governance/2_transfer_ownership.ts --network optimismgoerli
```

Once ownership is transferred to the council token, further changes including transferring ownership to public governance can only be executed by passing governance proposals.

#### Creating Governance Proposals
Governance proposals can be created by running the scripts in the proposal scripts in the [Governance folder](https://github.com/UXDProtocol/uxd-evm/tree/develop/scripts/governance).

#### Executing Governance Proposals
Once governance proposals pass, a frontend such as [Tally](https://tally.xyz) can be used to execute proposals.
Alternatively, the script `20_execute_proposal.ts` can be used. 

> Note: This script will have to be edited to match the parameters of the proposal to be executed.

### Cross chain token transfers
UXD and UXP tokens are omnichain fungible tokens (OFTs) which can be transferred from/to any of the chains the protocol is deployed to.
After deployment of the token contracts, cross-chain functionality must be enabled to support cross chain transfers.

To send tokens from chain A to chain B, chain A the core contracts must be deployed to both chains. Secondly, chain A must be set as a trusted remote of chain B and vice versa.
This can be done using the hardhat tasks `setUxdTrustedRemote` and `setUxpTrustedRemote`.
 
```
npx hardhat setUxdTrustedRemote --network optimismgoerli --dstchain arbitrumgoerli
npx hardhat setUxdTrustedRemote --network arbitrumgoerli --dstchain optimismgoerli
```
Cross chain UXD token transfers should now be enabled on the specified networks.

To send 1 UXD from optimism to arbitrum for example:
```
npx hardhat sendUxdCrossChain --network optimismgoerli --dstchain arbitrumgoerli --amount 1.0
```

### Upgrading Contracts
The `UXDController`, `PerpDepository` and `RageDnDepository` contracts are UUPS upgradeable contracts, thus, are self upgradeable. 
To upgrade the contracts, the new instance must first be deployed, then the call the `upgradeTo(address)` function to upgrade to the new instance.

Deploy the new contract instances using deploy scripts in scripts/upgrades folder.
In DevNet and MainNet, installing the new instance must be done through creating a governance proposal. 

## Testing
Tests are written using the Mocha testing framework and Chai assertion library. 

To run tests:
```
npx hardhat test
```

For a test coverage report:
```
npx hardhat coverage
```
