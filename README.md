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

| Address                                                            | Contract           | Network          |
| ------------------------------------------------------------------ | ------------------ | ---------------- |
| 0x1991D39FAF168EC48BaF10bbec8A8b6751BfC1E2                         | AccessManager      | Arbitrum         |
| 0x4B015ed3A1C7244544e00aC947077593D6789F74                         | OIDResolver        | Arbitrum         |
| 0x8006cCF2b3240bB716c86E5a16A9dD9b32eC5c53                         | ApplicationManager | Arbitrum         |
| 0x9a85Bb58CFb60ABd205c4Af7039fF73C86b41bd8                         | PermissionManager  | Arbitrum         |
| 0x6b5b50f2de8b387664838bd3c751e21f6b9aac7cf4bf5b2fb86e760b89a8a22d | Eas Schema         | Arbitrum         |
| 0x8194157B9464683E552c810b4FEA66251435606b                         | AccessManager      | Base Sepolia     |
| 0x79558DE98808e053442f34A8834cd1f645561CE4                         | OIDResolver        | Base Sepolia     |
| 0xF65e300B0e622B1Bc224c7351397ea2FF29f1c3D                         | ApplicationManager | Base Sepolia     |
| 0x52d0a71B42Dd84532A7B332fdfa059E8a7391092                         | PermissionManager  | Base Sepolia     |
| 0xe8c59f8de4cdf61c8ebefa3ed83d714acc767dda3bbff00623e73f5a8bf5255f | Eas Schema         | Base Sepolia     |
| 0x07d53fDeAb271f25648D4c1f600D267C87be608a                         | AccessManager      | Optimism Sepolia |
| 0xf304B86273d2A1BB62Fbf1292481496b3cf04572                         | OIDResolver        | Optimism Sepolia |
| 0xb250C2b5967FEc8241FD9a26C30145Fbdf347eEC                         | ApplicationManager | Optimism Sepolia |
| 0xFcE488b93696Ec5e279b8257E67F074AbFEc59d8                         | PermissionManager  | Optimism Sepolia |
| 0x2c988095892ea57c600e5cc6fb62531502bc0c8d038ac39dc3fab161b6f122db | Eas Schema         | Optimism Sepolia |

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
