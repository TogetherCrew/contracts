import { type HardhatUserConfig, vars } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import "@nomiclabs/hardhat-solhint";
import { generatePrivateKey } from "viem/accounts";

const PRIVATE_KEY = vars.has("PRIVATE_KEY")
	? vars.get("PRIVATE_KEY")
	: generatePrivateKey();
const ETHERSCAN_API_KEY = vars.has("ETHERSCAN_API_KEY")
	? vars.get("ETHERSCAN_API_KEY")
	: "";

const config: HardhatUserConfig = {
	solidity: {
		version: "0.8.26",
		settings: {
			optimizer: {
				enabled: true,
				runs: 1000,
			},
		},
	},
	networks: {
		sepolia: {
			accounts: [PRIVATE_KEY],
			url: "https://ethereum-sepolia-rpc.publicnode.com",
		},
	},
	etherscan: {
		apiKey: {
			sepolia: ETHERSCAN_API_KEY,
		},
	},
};

export default config;
