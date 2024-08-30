import {
	type Attestation,
	type AttestationRequest,
	EAS,
	NO_EXPIRATION,
	SchemaEncoder,
	SchemaRegistry,
	ZERO_BYTES32,
} from "@ethereum-attestation-service/eas-sdk";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import { BrowserProvider, JsonRpcSigner } from "ethers";
import hre from "hardhat";
import {
	type Account,
	type Address,
	type Chain,
	type Client,
	type Transport,
	type TypedDataDomain,
	decodeAbiParameters,
	encodeAbiParameters,
	getAddress,
	parseSignature,
	zeroHash,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const ATTESTER_ROLE = 1n;

const schema = "uint256 id";

function generateRandomAddress(): Address {
	const randomKey = generatePrivateKey();
	const account = privateKeyToAccount(randomKey);
	return account.address;
}

function clientToSigner(client: Client<Transport, Chain, Account>) {
	const { account, chain, transport } = client;
	const network = {
		chainId: chain.id,
		name: chain.name,
		ensAddress: chain.contracts?.ensRegistry?.address,
	};
	const provider = new BrowserProvider(transport, network);
	const signer = new JsonRpcSigner(provider, account.address);
	return signer;
}

describe("OIDResolver", () => {
	// We define a fixture to reuse the same setup in every test.
	// We use loadFixture to run this setup once, snapshot that state,
	// and reset Hardhat Network to that snapshot in every test.
	async function deploy() {
		// Contracts are deployed using the first signaturener/account by default
		const [deployer, attester, otherAccount] =
			await hre.viem.getWalletClients();

		const registry = await hre.viem.deployContract("SchemaRegistry");

		const eas = await hre.viem.deployContract("EAS", [registry.address]);

		const access = await hre.viem.deployContract("OIDAccessManager");
		await access.write.initialize();

		await access.write.grantRole([ATTESTER_ROLE, attester.account.address, 0]);

		const resolver = await hre.viem.deployContract("OIDResolver", [
			eas.address,
		]);

		await resolver.write.initialize([access.address]);

		const publicClient = await hre.viem.getPublicClient();

		// Need to mix in ethers
		const signer = clientToSigner(deployer);
		const schemaRegistry = new SchemaRegistry(registry.address);
		schemaRegistry.connect(signer);
		const tx = await schemaRegistry.register({
			schema,
			resolverAddress: resolver.address,
			revocable: true,
		});
		await tx.wait();

		const events = await registry.getEvents.Registered();
		const schemaUID = events[0].args.uid as Address;

		return {
			registry,
			eas,
			access,
			resolver,
			deployer,
			attester,
			schemaUID,
			otherAccount,
			publicClient,
		};
	}

	describe("Constructor", () => {
		it("Should set EAS", async () => {
			const { eas, resolver } = await loadFixture(deploy);
			expect(await resolver.read.eas()).to.eq(getAddress(eas.address));
		});
	});

	describe("Initialize", () => {
		it("Should set AccessManager", async () => {
			const { access, resolver } = await loadFixture(deploy);
			expect(await resolver.read.authority()).to.eq(getAddress(access.address));
		});
	});

	// describe("onAttest", () => {
	// 	it("Should revert if unauthorized attester", async () => {
	// 		const { eas, otherAccount, schemaUID } = await loadFixture(deploy);

	// 		const schemaEncoder = new SchemaEncoder(schema);
	// 		const encodedData = schemaEncoder.encodeData([
	// 			{ name: "id", value: 1, type: "uint256" },
	// 		]);

	// 		const recipient = generateRandomAddress();

	// 		const request = {
	// 			schema: schemaUID as Address,
	// 			data: {
	// 				recipient: recipient as Address,
	// 				expirationTime: 0n,
	// 				revocable: true,
	// 				data: encodedData as Address,
	// 				refUID: zeroHash,
	// 				value: 0n,
	// 			},
	// 		};

	// 		await expect(
	// 			eas.write.attest([request], { account: otherAccount.account.address }),
	// 		).to.be.rejectedWith(
	// 			`UnauthorizedAttester("${getAddress(otherAccount.account.address)}")`,
	// 		);
	// 	});
	// 	it("Should revert if invalid signature");
	// 	it("Should revert if invalid message");

	// 	describe("Success", () => {
	// 		let recipient: Address;
	// 		let encodedData: string;
	// 		let attester: Client<Transport, Chain, Account>;
	// 		let schemaUID: Address;
	// 		const revocable = true;
	// 		const expirationTime = 0n;
	// 		let attestationUID: string;
	// 		let attestation: Attestation;

	// 		before(async () => {
	// 			const fixture = await loadFixture(deploy);
	// 			const eas = fixture.eas;
	// 			attester = fixture.attester;
	// 			schemaUID = fixture.schemaUID;

	// 			const schemaEncoder = new SchemaEncoder(schema);
	// 			encodedData = schemaEncoder.encodeData([
	// 				{ name: "id", value: 1, type: "uint256" },
	// 			]);

	// 			recipient = generateRandomAddress();

	// 			const request: AttestationRequest = {
	// 				schema: schemaUID,
	// 				data: {
	// 					recipient,
	// 					expirationTime,
	// 					revocable,
	// 					data: encodedData,
	// 				},
	// 			};

	// 			const easContract = new EAS(eas.address);
	// 			const signer = clientToSigner(attester);
	// 			easContract.connect(signer);
	// 			const tx = await easContract.attest(request);
	// 			attestationUID = await tx.wait();
	// 			attestation = await easContract.getAttestation(attestationUID);
	// 		});

	// 		it("Should have correct uid", () => {
	// 			expect(attestation.uid).to.eq(attestationUID);
	// 		});
	// 		it("Should have correct schema", () => {
	// 			expect(attestation.schema).to.eq(schemaUID);
	// 		});
	// 		it("Should have correct expirationTime", () => {
	// 			expect(attestation.expirationTime).to.eq(expirationTime);
	// 		});
	// 		it("Should have correct revocable", () => {
	// 			expect(attestation.revocable).to.eq(revocable);
	// 		});
	// 		it("Should have correct attester", () => {
	// 			expect(attestation.attester).to.eq(
	// 				getAddress(attester.account.address),
	// 			);
	// 		});
	// 		it("Should have correct recipient", () => {
	// 			expect(attestation.recipient).to.eq(getAddress(recipient));
	// 		});
	// 		it("Should have correct data", () => {
	// 			expect(attestation.data).to.eq(encodedData);
	// 		});
	// 	});
	// });
	// it("Delegation Research", async () => {
	// 	const { eas, schemaUID, attester, otherAccount } =
	// 		await loadFixture(deploy);

	// 	// ---API---
	// 	// 1. Get EAS domain
	// 	// 2. Encode attestation data
	// 	// 3. Create attestation request data
	// 	// 4. Get nonce from EAS contract
	// 	// 5. Create attestation request message
	// 	// 6. Attester signs message
	// 	// 7. Parse the signature
	// 	// 8. Create DelegatedAttestationRequest
	// 	// ---FRONTEND---
	// 	// 9. Call EAS with attestByDelegation
	// 	const eip712Domain = await eas.read.eip712Domain();
	// 	const domain: TypedDataDomain = {
	// 		name: eip712Domain[1],
	// 		version: eip712Domain[2],
	// 		chainId: Number(eip712Domain[3]),
	// 		verifyingContract: eip712Domain[4],
	// 	};

	// 	console.log("domain", domain);

	// 	const types = [
	// 		{ name: "hash", type: "string" },
	// 		{ name: "provider", type: "string" },
	// 		{ name: "payload", type: "string" },
	// 	];
	// 	const data = encodeAbiParameters(types, ["hash", "google", "hello world"]);

	// 	console.log("data", data);

	// 	interface AttestationRequestData {
	// 		recipient: Address;
	// 		data: Address;
	// 		expirationTime: bigint;
	// 		revocable: boolean;
	// 		refUID: Address;
	// 		value: bigint;
	// 	}

	// 	interface DelegatedAttestationMessage extends AttestationRequestData {
	// 		schema: Address;
	// 		attester: Address;
	// 		deadline: bigint;
	// 		nonce: bigint;
	// 	}

	// 	interface AttestationRequest {
	// 		schema: Address;
	// 		data: AttestationRequestData;
	// 	}
	// 	interface DelegatedAttestationRequest extends AttestationRequest {
	// 		signature: { r: Address; s: Address; v: number };
	// 		attester: Address;
	// 		deadline: bigint;
	// 	}

	// 	const requestData: AttestationRequestData = {
	// 		data,
	// 		recipient: otherAccount.account.address,
	// 		expirationTime: NO_EXPIRATION,
	// 		refUID: ZERO_BYTES32,
	// 		revocable: true,
	// 		value: NO_EXPIRATION,
	// 	};

	// 	const nonce = await eas.read.getNonce([attester.account.address]);

	// 	const message: DelegatedAttestationMessage = {
	// 		...requestData,
	// 		schema: schemaUID,
	// 		attester: attester.account.address,
	// 		deadline: NO_EXPIRATION,
	// 		nonce,
	// 	};

	// 	const signature = await attester.signTypedData({
	// 		domain,
	// 		types: {
	// 			Attest: [
	// 				{ name: "attester", type: "address" },
	// 				{ name: "schema", type: "bytes32" },
	// 				{ name: "recipient", type: "address" },
	// 				{ name: "expirationTime", type: "uint64" },
	// 				{ name: "revocable", type: "bool" },
	// 				{ name: "refUID", type: "bytes32" },
	// 				{ name: "data", type: "bytes" },
	// 				{ name: "value", type: "uint256" },
	// 				{ name: "nonce", type: "uint256" },
	// 				{ name: "deadline", type: "uint64" },
	// 			],
	// 		},
	// 		primaryType: "Attest",
	// 		message,
	// 	});
	// 	console.log("signature", signature);

	// 	const { r, s, v } = parseSignature(signature);

	// 	const request: DelegatedAttestationRequest = {
	// 		signature: { r, s, v: Number(v) },
	// 		attester: attester.account.address,
	// 		schema: schemaUID,
	// 		data: requestData,
	// 		deadline: NO_EXPIRATION,
	// 	};

	// 	// request get sent to frontend

	// 	const tx = await eas.write.attestByDelegation([request], {
	// 		account: otherAccount.account.address,
	// 	});

	// 	console.log("tx", tx);

	// 	const [event] = await eas.getEvents.Attested();
	// 	const uid = event.args.uid as `0x${string}`;

	// 	const attestation = await eas.read.getAttestation([uid]);
	// 	console.log("attestation", attestation);

	// 	const output = decodeAbiParameters(types, attestation.data);
	// 	console.log("output", output);
	// });
});
