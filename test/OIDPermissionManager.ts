// import {
// 	EAS,
// 	SchemaEncoder,
// 	type SchemaItem,
// 	SchemaRegistry,
// } from "@ethereum-attestation-service/eas-sdk";
import {
	type Fixture,
	loadFixture,
} from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import {
	type Account,
	type Address,
	type Chain,
	type Client,
	type Transport,
	concat,
	getAddress,
} from "viem";
import { keccak256, toHex } from "viem";
import { deployAccessManager } from "../utils/deployAccessManager";

describe("OIDPermissionManager", () => {
	// We define a fixture to reuse the same setup in every test.
	// We use loadFixture to run this setup once, snapshot that state,
	// and reset Hardhat Network to that snapshot in every test.
	async function deploy() {
		const [deployer, manager, application, otherAccount] =
			await hre.viem.getWalletClients();

		const key = keccak256(toHex("id".concat("providers", "metadata")));

		const access = await deployAccessManager(deployer);
		const PERMISSION_MANAGER_ROLE = await access.read.PERMISSION_MANAGER_ROLE();

		// Assign manager to PERMISSION_MANAGER_ROLE
		await access.write.grantRole([
			PERMISSION_MANAGER_ROLE,
			manager.account.address,
			0,
		]);

		const contract = await hre.viem.deployContract("OIDPermissionManager", [
			access.address,
			// eas.address,
		]);
		return {
			contract,
			access,
			deployer,
			manager,
			application,
			otherAccount,
			key,
		};
	}

	describe("Deployment", () => {
		it("Should set the authority", async () => {
			const { contract, access } = await loadFixture(deploy);
			expect(await contract.read.authority()).to.equal(
				getAddress(access.address),
			);
		});
	});

	describe("Grant Permission", () => {
		describe("Recipient", () => {
			it("Should update permission", async () => {
				const { contract, manager, key, application } =
					await loadFixture(deploy);

				expect(
					await contract.read.hasPermission([key, application.account.address]),
				).to.be.false;

				await contract.write.grantPermission(
					[key, application.account.address],
					{ account: manager.account },
				);

				expect(
					await contract.read.hasPermission([key, application.account.address]),
				).to.be.true;
			});
		});

		describe("Manager", () => {
			it("Should update permission", async () => {
				const { contract, manager, key, application } =
					await loadFixture(deploy);

				expect(
					await contract.read.hasPermission([key, application.account.address]),
				).to.be.false;

				await contract.write.grantPermission(
					[key, application.account.address],
					{ account: manager.account },
				);

				expect(
					await contract.read.hasPermission([key, application.account.address]),
				).to.be.true;
			});
		});

		describe("Other", () => {
			it("Should revert with UnauthorizedAccess", async () => {
				const { contract, key, application, otherAccount } =
					await loadFixture(deploy);

				await expect(
					contract.write.grantPermission([key, application.account.address], {
						account: otherAccount.account,
					}),
				).to.be.rejectedWith(
					`UnauthorizedAccess("${getAddress(otherAccount.account.address)}")`,
				);
			});
		});

		describe("Event", () => {
			it("Should emit PermissionUpdated event", async () => {
				const { manager, contract, key, application } =
					await loadFixture(deploy);
				const txHash = await contract.write.grantPermission(
					[key, application.account.address],
					{ account: manager.account },
				);

				const events = await contract.getEvents.PermissionUpdated();

				expect(events.length).to.be.equal(1);

				const event = events[0];
				expect(event.eventName).to.be.equal("PermissionUpdated");
				expect(event.transactionHash).to.be.equal(txHash);
				expect(event.args.key).to.be.equal(key);
				expect(event.args.account).to.contain(
					getAddress(application.account.address),
				);
				expect(event.args.granted).to.be.true;
			});
		});
	});

	describe("Revoke Permission", () => {
		let fixture: Fixture;

		beforeEach(async () => {
			fixture = await loadFixture(deploy);
			const { manager, application, key, contract } = fixture;
			await contract.write.grantPermission([key, application.account.address], {
				account: manager.account,
			});
			expect(
				await contract.read.hasPermission([key, application.account.address]),
			).to.be.true;
		});

		describe("Recipient", () => {
			it("Should revoke attestation", async () => {
				const { manager, application, key, contract } = fixture;

				await contract.write.revokePermission(
					[key, application.account.address],
					{ account: manager.account },
				);

				expect(
					await contract.read.hasPermission([key, application.account.address]),
				).to.be.false;
			});
		});

		describe("Manager", () => {
			it("Should revoke attestation", async () => {
				const { manager, application, key, contract } = fixture;

				await contract.write.revokePermission(
					[key, application.account.address],
					{ account: manager.account },
				);

				expect(
					await contract.read.hasPermission([key, application.account.address]),
				).to.be.false;
			});
		});

		describe("Other", () => {
			it("Should revert with UnauthorizedAccess", async () => {
				const { contract, key, application, otherAccount } = fixture;

				await expect(
					contract.write.revokePermission([key, application.account.address], {
						account: otherAccount.account,
					}),
				).to.be.rejectedWith(
					`UnauthorizedAccess("${getAddress(otherAccount.account.address)}")`,
				);
			});
		});

		describe("Event", () => {
			it("Should emit PermissionUpdated event", async () => {
				const { contract, manager, key, application } = fixture;
				const txHash = await contract.write.revokePermission(
					[key, application.account.address],
					{ account: manager.account },
				);

				const events = await contract.getEvents.PermissionUpdated();

				expect(events.length).to.be.equal(1);

				const event = events[0];
				expect(event.eventName).to.be.equal("PermissionUpdated");
				expect(event.transactionHash).to.be.equal(txHash);
				expect(event.args.key).to.be.equal(key);
				expect(event.args.account).to.contain(
					getAddress(application.account.address),
				);
				expect(event.args.granted).to.be.false;
			});
		});
	});

	describe("Has Permission", () => {
		describe("Attestation is valid", () => {
			it("Should return true", async () => {
				const { contract, manager, key, application } =
					await loadFixture(deploy);

				await contract.write.grantPermission(
					[key, application.account.address],
					{ account: manager.account },
				);

				expect(
					await contract.read.hasPermission([key, application.account.address]),
				).to.be.true;
			});
			it("Should return false", async () => {
				const { contract, key, application } = await loadFixture(deploy);

				expect(
					await contract.read.hasPermission([key, application.account.address]),
				).to.be.false;
			});
		});
	});
});
