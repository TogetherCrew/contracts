import { SchemaRegistry } from "@ethereum-attestation-service/eas-sdk";
import hre from "hardhat";
import type {
	Account,
	Address,
	Chain,
	Client,
	Transport,
	WalletClient,
} from "viem";
import { clientToSigner } from "./clientToSigner";

export async function deployEAS(deployer: WalletClient) {
	const registry = await hre.viem.deployContract("SchemaRegistry", [], {
		account: deployer.account,
	});
	const eas = await hre.viem.deployContract("EAS", [registry.address], {
		account: deployer.account,
	});
	return {
		registry,
		eas,
	};
}

export async function deploySchema(
	deployer: Client<Transport, Chain, Account>,
	registryAddress: string,
	schema: string,
	resolverAddress = "0x0000000000000000000000000000000000000000",
	revocable = true,
): Promise<Address> {
	const registry = new SchemaRegistry(registryAddress);

	const signer = clientToSigner(deployer);
	registry.connect(signer);
	const tx = await registry.register({ schema, resolverAddress, revocable });
	return (await tx.wait()) as Address;
}
