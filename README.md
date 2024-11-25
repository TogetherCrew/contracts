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
|--------------------------------------------|--------------------------|
| 0x548c887A24077e13F17a1cE21B3a24B9c06e3D8d | TogetherCrew Deployer    |
| 0x1A486364AEB60Db41108799CfEfFc5dA98B40574 | TogetherCrew Application |
| 0x127D8ed45aF416019dB1D4a39Ad44141A8FF56b2 | TogetherCrew Manager     |
| 0xc2539c70de7b24b9124e4e897083ccc72e83c7c7 | TogetherCrew Attester     |


## Deployments

| Address | Tag | Chain |
|---------|-----|-------|


// Localhost
RUNNING network -> npx hardhat node
Remove ignition/deployments/chain-31337
Deploy to localhost -> npx hardhat run ./scripts/deploy.ts --network localhost 

// Network
envs -> npx hardhat vars set PRIVATE_KEY PRIVATE_KEY | npx hardhat vars set PRIVATE_KEY ETHERSCAN_API_KEY (more info: https://hardhat.org/hardhat-runner/docs/guides/configuration-variables)
hardhat.config -> update networks + etherscan
create deploy file (scripts/) for the network + providing wallet addrs + add eas contract addr (https://docs.attest.org/docs/quick--start/contracts#installation)
npx hardhat run .\scripts\deployOptimismSepolia.ts --network optimismSepolia (equals to name in the hardhat.config networks)