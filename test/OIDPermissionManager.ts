import {
	EAS,
	SchemaEncoder,
	type SchemaItem,
	SchemaRegistry,
} from "@ethereum-attestation-service/eas-sdk";
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
	getAddress,
} from "viem";
import { clientToSigner } from "../utils/clientToSigner";
import { SIMPLE_SCHEMA } from "../utils/constants";
import { ROLES } from "../utils/roles";

const { ID: PERMISSION_MANAGER_ROLE_ID, LABEL: PERMISSION_MANAGER_ROLE_LABEL } =
	ROLES.PERMISSION_MANAGER;

describe("OIDPermissionManager", () => {
	async function attest(
		client: Client<Transport, Chain, Account>,
		recipient: Address,
		easAddress: Address,
		schemaUID: Address,
		schema: string,
		data: SchemaItem[],
	) {
		const schemaEncoder = new SchemaEncoder(schema);
		const encodedData = schemaEncoder.encodeData(data);

		const eas = new EAS(easAddress);
		const signer = clientToSigner(client);
		eas.connect(signer);
		const tx = await eas.attest({
			schema: schemaUID,
			data: {
				recipient,
				expirationTime: 0n,
				revocable: true,
				data: encodedData,
			},
		});
		const attestationUID = (await tx.wait()) as Address;

		return { attestationUID };
	}

	async function deployEAS(deployer: Client<Transport, Chain, Account>) {
		const registry = await hre.viem.deployContract("SchemaRegistry");
		const eas = await hre.viem.deployContract("EAS", [registry.address]);

		// Need to mix in ethers
		const signer = clientToSigner(deployer);
		const schemaRegistry = new SchemaRegistry(registry.address);
		schemaRegistry.connect(signer);
		const tx = await schemaRegistry.register({ schema: SIMPLE_SCHEMA });
		await tx.wait();

		const events = await registry.getEvents.Registered();
		const schemaUID = events[0].args.uid as Address;

		return {
			registry,
			eas,
			schemaUID,
		};
	}

	// We define a fixture to reuse the same setup in every test.
	// We use loadFixture to run this setup once, snapshot that state,
	// and reset Hardhat Network to that snapshot in every test.
	async function deploy() {
		// Contracts are deployed using the first signer/account by default
		const [deployer, manager, attester, recipient, application, otherAccount] =
			await hre.viem.getWalletClients();

		// EAS Deployment
		const { registry, eas, schemaUID } = await deployEAS(deployer);
		const { attestationUID } = await attest(
			attester,
			recipient.account.address,
			eas.address,
			schemaUID,
			SIMPLE_SCHEMA,
			[{ name: "id", value: 1, type: "uint256" }],
		);

		const access = await hre.viem.deployContract("OIDAccessManager");
		await access.write.initialize();
		await access.write.labelRole([
			PERMISSION_MANAGER_ROLE_ID,
			PERMISSION_MANAGER_ROLE_LABEL,
		]);
		await access.write.grantRole([
			PERMISSION_MANAGER_ROLE_ID,
			manager.account.address,
			0,
		]);

		// Assign manager to PERMISSION_MANAGER_ROLE
		await access.write.grantRole([
			PERMISSION_MANAGER_ROLE_ID,
			manager.account.address,
			0,
		]);

		const contract = await hre.viem.deployContract("OIDPermissionManager", [
			access.address,
			eas.address,
		]);

		return {
			contract,
			access,
			deployer,
			manager,
			otherAccount,
			eas,
			registry,
			schemaUID,
			recipient,
			application,
			attestationUID,
			attester,
		};
	}

	describe("Deployment", () => {
		it("Should set the authority", async () => {
			const { contract, access } = await loadFixture(deploy);
			expect(await contract.read.authority()).to.equal(
				getAddress(access.address),
			);
		});
		it("Should set the eas", async () => {
			const { contract, eas } = await loadFixture(deploy);
			expect(await contract.read.eas()).to.equal(getAddress(eas.address));
		});
	});

	describe("Grant Permission", () => {
		describe("Recipient", () => {
			it("Should update permission", async () => {
				const { contract, recipient, attestationUID, application } =
					await loadFixture(deploy);

				expect(
					await contract.read.hasPermission([
						attestationUID,
						application.account.address,
					]),
				).to.be.false;

				await contract.write.grantPermission(
					[attestationUID, application.account.address],
					{ account: recipient.account },
				);

				expect(
					await contract.read.hasPermission([
						attestationUID,
						application.account.address,
					]),
				).to.be.true;
			});
		});

		describe("Manager", () => {
			it("Should update permission", async () => {
				const { contract, manager, attestationUID, application } =
					await loadFixture(deploy);

				expect(
					await contract.read.hasPermission([
						attestationUID,
						application.account.address,
					]),
				).to.be.false;

				await contract.write.grantPermission(
					[attestationUID, application.account.address],
					{ account: manager.account },
				);

				expect(
					await contract.read.hasPermission([
						attestationUID,
						application.account.address,
					]),
				).to.be.true;
			});
		});

		describe("Other", () => {
			it("Should revert with UnauthorizedAccess", async () => {
				const { contract, attestationUID, application, otherAccount } =
					await loadFixture(deploy);

				await expect(
					contract.write.grantPermission(
						[attestationUID, application.account.address],
						{ account: otherAccount.account },
					),
				).to.be.rejectedWith(
					`UnauthorizedAccess("${getAddress(otherAccount.account.address)}")`,
				);
			});
		});

		describe("Event", () => {
			it("Should emit PermissionUpdated event", async () => {
				const { contract, recipient, attestationUID, application } =
					await loadFixture(deploy);
				const txHash = await contract.write.grantPermission(
					[attestationUID, application.account.address],
					{ account: recipient.account },
				);

				const events = await contract.getEvents.PermissionUpdated();

				expect(events.length).to.be.equal(1);

				const event = events[0];
				expect(event.eventName).to.be.equal("PermissionUpdated");
				expect(event.transactionHash).to.be.equal(txHash);
				expect(event.args.uid).to.be.equal(attestationUID);
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
			const { attestationUID, application, recipient, contract } = fixture;
			await contract.write.grantPermission(
				[attestationUID, application.account.address],
				{ account: recipient.account },
			);
			expect(
				await contract.read.hasPermission([
					attestationUID,
					application.account.address,
				]),
			).to.be.true;
		});

		describe("Recipient", () => {
			it("Should revoke attestation", async () => {
				const { attestationUID, application, recipient, contract } = fixture;

				await contract.write.revokePermission(
					[attestationUID, application.account.address],
					{ account: recipient.account },
				);

				expect(
					await contract.read.hasPermission([
						attestationUID,
						application.account.address,
					]),
				).to.be.false;
			});
		});

		describe("Manager", () => {
			it("Should revoke attestation", async () => {
				const { attestationUID, application, manager, contract } = fixture;

				await contract.write.revokePermission(
					[attestationUID, application.account.address],
					{ account: manager.account },
				);

				expect(
					await contract.read.hasPermission([
						attestationUID,
						application.account.address,
					]),
				).to.be.false;
			});
		});

		describe("Other", () => {
			it("Should revert with UnauthorizedAccess", async () => {
				const { contract, attestationUID, application, otherAccount } = fixture;

				await expect(
					contract.write.revokePermission(
						[attestationUID, application.account.address],
						{ account: otherAccount.account },
					),
				).to.be.rejectedWith(
					`UnauthorizedAccess("${getAddress(otherAccount.account.address)}")`,
				);
			});
		});

		describe("Event", () => {
			it("Should emit PermissionUpdated event", async () => {
				const { contract, recipient, attestationUID, application } = fixture;
				const txHash = await contract.write.revokePermission(
					[attestationUID, application.account.address],
					{ account: recipient.account },
				);

				const events = await contract.getEvents.PermissionUpdated();

				expect(events.length).to.be.equal(1);

				const event = events[0];
				expect(event.eventName).to.be.equal("PermissionUpdated");
				expect(event.transactionHash).to.be.equal(txHash);
				expect(event.args.uid).to.be.equal(attestationUID);
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
				const { contract, recipient, attestationUID, application } =
					await loadFixture(deploy);

				await contract.write.grantPermission(
					[attestationUID, application.account.address],
					{ account: recipient.account },
				);

				expect(
					await contract.read.hasPermission([
						attestationUID,
						application.account.address,
					]),
				).to.be.true;
			});
			it("Should return false", async () => {
				const { contract, attestationUID, application } =
					await loadFixture(deploy);

				expect(
					await contract.read.hasPermission([
						attestationUID,
						application.account.address,
					]),
				).to.be.false;
			});
		});
		describe("Attestation is revoked", () => {
			it("Should return false", async () => {
				const {
					contract,
					attestationUID,
					recipient,
					application,
					eas,
					schemaUID,
					attester,
				} = await loadFixture(deploy);

				await contract.write.grantPermission(
					[attestationUID, application.account.address],
					{ account: recipient.account },
				);

				expect(
					await contract.read.hasPermission([
						attestationUID,
						application.account.address,
					]),
				).to.be.true;

				const e = new EAS(eas.address);
				const signer = clientToSigner(attester);
				e.connect(signer);

				const tx = await e.revoke({
					schema: schemaUID,
					data: { uid: attestationUID },
				});
				await tx.wait();

				expect(
					await contract.read.hasPermission([
						attestationUID,
						application.account.address,
					]),
				).to.be.false;
			});
		});
	});
});
