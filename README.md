# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.ts
```

## Addresses

| Address                                    | Tag                      |
| ------------------------------------------ | ------------------------ |
| 0x548c887A24077e13F17a1cE21B3a24B9c06e3D8d | TogetherCrew Deployer    |
| 0x1A486364AEB60Db41108799CfEfFc5dA98B40574 | TogetherCrew Application |
| 0x127D8ed45aF416019dB1D4a39Ad44141A8FF56b2 | TogetherCrew Manager     |
| 0xc2539c70de7b24b9124e4e897083ccc72e83c7c7 | TogetherCrew Attester    |

## Deployments

Before deploying, ensure that previous deployment files are removed to prevent conflicts:

- **Remove the directory**: `ignition/deployments/chain-{chainId}` (replace `{chainId}` with the ID of the chain you're deploying to).

### Deploying to Localhost

1.  **Start the Hardhat local node**:

- `npx hardhat node`

- **Deploy contracts to localhost**:

1.  `npx hardhat run ./scripts/deploys/deploy.ts --network localhost`

### Deploying to a Network

1.  **Set up environment variables**:

    - **Private Key**: Set your wallet's private key as `PRIVATE_KEY`.
    - **Block Explorer API Key**: Set your block explorer API key (e.g., Etherscan API key) for contract verification.

    Use Hardhat's `vars` command to set and get environment variables:

- `npx hardhat vars set PRIVATE_KEY
npx hardhat vars get PRIVATE_KEY`
- **Update Hardhat configuration**:

  - In your `hardhat.config.js` or `hardhat.config.ts` file:
    - **Add network configuration** under `networks` with the appropriate settings (e.g., RPC URL, accounts).
    - **Configure Etherscan** for contract verification by adding your API key under `etherscan`.

- **Create a deployment script**:

  - Place your deployment script in the `scripts/deploys/` directory.

- **Provide necessary addresses**:

  - **Wallet Addresses**: Ensure your deployment script has access to the necessary wallet addresses.
  - **EAS Contract Address**: Include the EAS (Ethereum Attestation Service) contract address.

    Refer to the [EAS Contracts Installation Guide](https://docs.attest.org/docs/quick--start/contracts#installation) for details.

- **Deploy contracts to the network**:

`npx hardhat run ./scripts/deploys/{scriptname}.ts --network {networkname}`

- Replace `{scriptname}` with your deployment script name.
- Replace `{networkname}` with the network name as defined in your `hardhat.config`.
