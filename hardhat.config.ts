import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import "@nomiclabs/hardhat-solhint";

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
};

export default config;
