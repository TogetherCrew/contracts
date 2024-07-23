import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { type Address, getAddress } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const ATTESTER_ROLE = 1n;

function generateRandomAddress(): Address {
	const randomKey = generatePrivateKey();
	const account = privateKeyToAccount(randomKey);
	return account.address;
}

describe("OIDResolver", () => {
	// We define a fixture to reuse the same setup in every test.
	// We use loadFixture to run this setup once, snapshot that state,
	// and reset Hardhat Network to that snapshot in every test.
	async function deploy() {
		// Contracts are deployed using the first signer/account by default
		const [deployer, attester, otherAccount] =
			await hre.viem.getWalletClients();

		const registry = await hre.viem.deployContract("SchemaRegistry");

		const eas = await hre.viem.deployContract("EAS", [registry.address]);

		const access = await hre.viem.deployContract("OIDAccessManager");
		await access.write.initialize();

		await access.write.grantRole([ATTESTER_ROLE, attester.account.address, 0]);

		const contract = await hre.viem.deployContract("OIDResolver", [
			eas.address,
		]);

		await contract.write.initialize([access.address]);

		const publicClient = await hre.viem.getPublicClient();

		return {
			registry,
			eas,
			access,
			contract,
			deployer,
			attester,
			otherAccount,
			publicClient,
		};
	}

	describe("Constructor", () => {
		it("Should set EAS", async () => {
			const { eas, contract } = await loadFixture(deploy);
			expect(await contract.read.eas()).to.eq(getAddress(eas.address));
		});
	});

	describe("Initialize", () => {
		it("Should set AccessManager", async () => {
			const { access, contract } = await loadFixture(deploy);
			expect(await contract.read.authority()).to.eq(getAddress(access.address));
		});
	});
});
