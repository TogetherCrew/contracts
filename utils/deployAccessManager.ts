import hre from "hardhat";
import type { WalletClient } from "viem";

export async function deployAccessManager(deployer: WalletClient) {
	const contract = await hre.viem.deployContract("OIDAccessManager", [], {
		account: deployer.account,
	});
	await contract.write.initialize();
	return contract;
}
