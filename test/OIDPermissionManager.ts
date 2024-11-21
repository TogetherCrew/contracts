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
	keccak256,
	toHex,
} from "viem";
import { clientToSigner } from "../utils/clientToSigner";
import { deployAccessManager } from "../utils/deployAccessManager";
import { deployEAS, deploySchema } from "../utils/deployEAS";

describe("OIDPermissionManager", () => {
	const SIMPLE_SCHEMA = "bytes32 key,string provider,string secret";
	async function attest(
		client: Client<Transport, Chain, Account>,
		recipient: Address,
		easAddress: Address,
		schemaUID: Address,
		schema: string,
		key: `0x${string}`,
		provider: string,
		secret: string,
	) {
		const schemaEncoder = new SchemaEncoder(schema);
		const data = [
			{ name: "key", value: key, type: "bytes32" },
			{ name: "provider", value: provider, type: "string" },
			{ name: "secret", value: secret, type: "string" },
		];
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

		return { attestationUID, key };
	}

	async function deploy() {
		const [deployer, manager, attester, recipient, application, otherAccount] =
			await hre.viem.getWalletClients();

		// EAS Deployment
		const { registry, eas } = await deployEAS(deployer);
		const schemaUID = await deploySchema(
			deployer,
			registry.address,
			SIMPLE_SCHEMA,
		);

		const key = keccak256(toHex("id".concat("provider", "metadata")));
		const provider = "ProviderName";
		const secret = "SecretValue";

		const { attestationUID } = await attest(
			attester,
			recipient.account.address,
			eas.address,
			schemaUID,
			SIMPLE_SCHEMA,
			key,
			provider,
			secret,
		);

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
			key,
			provider,
			secret,
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
				const { contract, recipient, attestationUID, application, key } =
					await loadFixture(deploy);

				expect(
					await contract.read.hasPermission([key, application.account.address]),
				).to.be.false;

				await contract.write.grantPermission(
					[attestationUID, application.account.address],
					{ account: recipient.account },
				);

				expect(
					await contract.read.hasPermission([key, application.account.address]),
				).to.be.true;
			});
		});

		describe("Manager", () => {
			it("Should update permission", async () => {
				const { contract, manager, attestationUID, application, key } =
					await loadFixture(deploy);

				expect(
					await contract.read.hasPermission([key, application.account.address]),
				).to.be.false;

				await contract.write.grantPermission(
					[attestationUID, application.account.address],
					{ account: manager.account },
				);

				expect(
					await contract.read.hasPermission([key, application.account.address]),
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
				const { contract, recipient, attestationUID, application, key } =
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
				expect(event.args.key).to.be.equal(key);
				expect(event.args.account).to.contain(
					getAddress(application.account.address),
				);
				expect(event.args.granted).to.be.true;
			});
		});

		it("Should revert with AttestationNotFound", async () => {
			const { contract, recipient, application } = await loadFixture(deploy);
			const invalidAttestationUID =
				"0x0000000000000000000000000000000000000000000000000000000000000000";

			await expect(
				contract.write.grantPermission(
					[invalidAttestationUID, application.account.address],
					{ account: recipient.account },
				),
			).to.be.rejectedWith(`AttestationNotFound("${invalidAttestationUID}")`);
		});

		it("Should revert with AttestationRevoked", async () => {
			const {
				contract,
				recipient,
				attestationUID,
				application,
				eas,
				schemaUID,
				attester,
			} = await loadFixture(deploy);

			// Revoke the attestation
			const e = new EAS(eas.address);
			const signer = clientToSigner(attester);
			e.connect(signer);

			const tx = await e.revoke({
				schema: schemaUID,
				data: { uid: attestationUID },
			});
			await tx.wait();

			await expect(
				contract.write.grantPermission(
					[attestationUID, application.account.address],
					{ account: recipient.account },
				),
			).to.be.rejectedWith(`AttestationRevoked("${attestationUID}")`);
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
		});

		describe("Recipient", () => {
			it("Should revoke permission", async () => {
				const { attestationUID, application, recipient, contract, key } =
					fixture;

				await contract.write.revokePermission(
					[attestationUID, application.account.address],
					{ account: recipient.account },
				);

				expect(
					await contract.read.hasPermission([key, application.account.address]),
				).to.be.false;
			});
		});

		describe("Manager", () => {
			it("Should revoke permission", async () => {
				const { attestationUID, application, manager, contract, key } = fixture;

				await contract.write.revokePermission(
					[attestationUID, application.account.address],
					{ account: manager.account },
				);

				expect(
					await contract.read.hasPermission([key, application.account.address]),
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
				const { contract, recipient, attestationUID, application, key } =
					fixture;
				const txHash = await contract.write.revokePermission(
					[attestationUID, application.account.address],
					{ account: recipient.account },
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
		it("Should revert with AttestationNotFound", async () => {
			const { contract, recipient, application } = await loadFixture(deploy);
			const invalidAttestationUID =
				"0x0000000000000000000000000000000000000000000000000000000000000000";

			await expect(
				contract.write.revokePermission(
					[invalidAttestationUID, application.account.address],
					{ account: recipient.account },
				),
			).to.be.rejectedWith(`AttestationNotFound("${invalidAttestationUID}")`);
		});
		it("Should revert with AttestationRevoked", async () => {
			const {
				contract,
				recipient,
				attestationUID,
				application,
				eas,
				schemaUID,
				attester,
			} = await loadFixture(deploy);

			// Revoke the attestation
			const e = new EAS(eas.address);
			const signer = clientToSigner(attester);
			e.connect(signer);

			const tx = await e.revoke({
				schema: schemaUID,
				data: { uid: attestationUID },
			});
			await tx.wait();

			await expect(
				contract.write.revokePermission(
					[attestationUID, application.account.address],
					{ account: recipient.account },
				),
			).to.be.rejectedWith(`AttestationRevoked("${attestationUID}")`);
		});
	});

	describe("Has Permission", () => {
		describe("Permission Granted", () => {
			it("Should return true", async () => {
				const { contract, recipient, attestationUID, application, key } =
					await loadFixture(deploy);

				await contract.write.grantPermission(
					[attestationUID, application.account.address],
					{ account: recipient.account },
				);

				expect(
					await contract.read.hasPermission([key, application.account.address]),
				).to.be.true;
			});
		});

		describe("Permission Not Granted", () => {
			it("Should return false", async () => {
				const { contract, application, key } = await loadFixture(deploy);

				expect(
					await contract.read.hasPermission([key, application.account.address]),
				).to.be.false;
			});
		});

		it("Should revert with AttestationRevoked", async () => {
			const {
				contract,
				attestationUID,
				recipient,
				application,
				eas,
				schemaUID,
				attester,
				key,
			} = await loadFixture(deploy);

			await contract.write.grantPermission(
				[attestationUID, application.account.address],
				{ account: recipient.account },
			);

			expect(
				await contract.read.hasPermission([key, application.account.address]),
			).to.be.true;

			const e = new EAS(eas.address);
			const signer = clientToSigner(attester);
			e.connect(signer);

			const tx = await e.revoke({
				schema: schemaUID,
				data: { uid: attestationUID },
			});
			await tx.wait();

			// After revocation, the permission should be removed
			expect(
				await contract.read.hasPermission([key, application.account.address]),
			).to.be.false;
		});
	});
});
