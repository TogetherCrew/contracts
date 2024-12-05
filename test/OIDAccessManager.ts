import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("OIDAccessManager", () => {
	// We define a fixture to reuse the same setup in every test.
	// We use loadFixture to run this setup once, snapshot that state,
	// and reset Hardhat Network to that snapshot in every test.
	async function deploy() {
		// Contracts are deployed using the first signer/account by default
		const [deployer] = await hre.viem.getWalletClients();

		const contract = await hre.viem.deployContract("OIDAccessManager");
		await contract.write.initialize();
		const publicClient = await hre.viem.getPublicClient();
		const ADMIN_ROLE = await contract.read.ADMIN_ROLE();

		return {
			contract,
			deployer,
			publicClient,
			ADMIN_ROLE,
		};
	}

	describe("Deployment", () => {
		it("Should set the deployer as admin", async () => {
			const { contract, deployer, ADMIN_ROLE } = await loadFixture(deploy);
			expect(
				await contract.read.hasRole([ADMIN_ROLE, deployer.account.address]),
			).to.deep.eq([true, 0]);
		});
		it("Should have APPLICATION_MANAGER_ROLE", async () => {
			const { contract, deployer } = await loadFixture(deploy);
			expect(await contract.read.APPLICATION_MANAGER_ROLE()).to.eq(1n);
		});
		it("Should have ATTESTATION_MANAGER_ROLE", async () => {
			const { contract, deployer } = await loadFixture(deploy);
			expect(await contract.read.ATTESTATION_MANAGER_ROLE()).to.eq(2n);
		});
		it("Should have PERMISSION_MANAGER_ROLE", async () => {
			const { contract, deployer } = await loadFixture(deploy);
			expect(await contract.read.PERMISSION_MANAGER_ROLE()).to.eq(3n);
		});
	});
});
