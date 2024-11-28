import hre from "hardhat";

// const easAddress = "0xC2679fBD37d54388Ce493F1DB75320D236e1815e"; // Sepolia EAS
const registryAddress = "0x0a7E2Ff54e76B8E6659aedc9103FB21c038050D0"; // Sepolia EAS registry
const resolverAddress = "0x3e5681BFEDcB788947BcfA4D096f40705Fe043ac"; // Sepolia resolver

async function main() {
	const schema = "bytes32 key, string provider, string secret";
	const registry = await hre.viem.getContractAt(
		"SchemaRegistry",
		registryAddress,
	);
	await registry.write.register([schema, resolverAddress, true]);
}

main().catch(console.error);
