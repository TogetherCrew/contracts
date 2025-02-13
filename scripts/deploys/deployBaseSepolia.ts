import hre from "hardhat";
import {
	http,
	type Address,
	createPublicClient,
	toFunctionSelector,
} from "viem";
import { baseSepolia } from "viem/chains";
import ApplicationManager from "../../ignition/modules/ApplicationManagerModule";
import OIDAccessManagerModule from "../../ignition/modules/OIDAccessManagerModule";
import OIDPermissionManager from "../../ignition/modules/OIDPermissionManagerModule";
import OIDResolver from "../../ignition/modules/OIDResolverModule";
import { deployEAS } from "../../utils/deployEAS";

const eas = "0x4200000000000000000000000000000000000021"; // Base Sepolia

async function main() {
	const appManagerWallet = "0x127d8ed45af416019db1d4a39ad44141a8ff56b2";
	const attesterWallet = "0xc2539c70de7b24b9124e4e897083ccc72e83c7c7";
	const permissionManagerWallet = "0x127d8ed45af416019db1d4a39ad44141a8ff56b2";

	const [deployer] = await hre.viem.getWalletClients();

	// Create the public client connected to base Sepolia
	const publicClient = createPublicClient({
		chain: baseSepolia,
		transport: http("https://sepolia.base.org"),
	});

	// const easContract = await deployEAS(deployer);
	// const eas = easContract.eas.address;
	const { contract: authority } = await hre.ignition.deploy(
		OIDAccessManagerModule,
	);

	console.log(`AccessManager deployed to: ${authority.address}`);

	const { contract: resolver } = await hre.ignition.deploy(OIDResolver, {
		parameters: {
			OIDResolver: { eas, authority: authority.address },
		},
	});
	console.log(`OIDResolver deployed to: ${resolver.address}`);

	const { contract: appManager } = await hre.ignition.deploy(
		ApplicationManager,
		{ parameters: { ApplicationManager: { authority: authority.address } } },
	);
	console.log(`ApplicationManager deployed to: ${appManager.address}`);

	const { contract: permissionManager } = await hre.ignition.deploy(
		OIDPermissionManager,
		{
			parameters: {
				OIDPermissionManager: {
					initialAuthority: authority.address,
					initialEAS: eas,
				},
			},
		},
	);
	console.log(`PermissionManager deployed to: ${permissionManager.address}`);

	await hre.run("verify:verify", {
		address: authority.address,
		constructorArguments: [],
	});
	console.log("AccessManager verified");

	await hre.run("verify:verify", {
		address: resolver.address,
		constructorArguments: [eas],
	});
	console.log("OIDResolver verified");

	await hre.run("verify:verify", {
		address: appManager.address,
		constructorArguments: [authority.address],
	});
	console.log("ApplicationManager verified");

	await hre.run("verify:verify", {
		address: permissionManager.address,
		constructorArguments: [authority.address, eas],
	});
	console.log("PermissionManager verified");

	const APP_MANAGER_ROLE = await authority.read.APPLICATION_MANAGER_ROLE();
	const ATTESTER_ROLE = await authority.read.ATTESTATION_MANAGER_ROLE();
	const PERMISSION_ROLE = await authority.read.PERMISSION_MANAGER_ROLE();

	let txHash: Address;

	txHash = await authority.write.labelRole([
		APP_MANAGER_ROLE,
		"APP_MANAGER_ROLE",
	]);
	await publicClient.waitForTransactionReceipt({ hash: txHash });
	console.log("Labeled APP_MANAGER_ROLE");

	txHash = await authority.write.labelRole([ATTESTER_ROLE, "ATTESTER_ROLE"]);
	await publicClient.waitForTransactionReceipt({ hash: txHash });
	console.log("Labeled ATTESTER_ROLE");

	txHash = await authority.write.labelRole([
		PERMISSION_ROLE,
		"PERMISSION_ROLE",
	]);
	await publicClient.waitForTransactionReceipt({ hash: txHash });
	console.log("Labeled PERMISSION_ROLE");

	txHash = await authority.write.grantRole([
		APP_MANAGER_ROLE,
		appManagerWallet,
		0,
	]);
	await publicClient.waitForTransactionReceipt({ hash: txHash });
	console.log(`Granted APP_MANAGER_ROLE to ${appManagerWallet}`);

	txHash = await authority.write.grantRole([ATTESTER_ROLE, attesterWallet, 0]);
	await publicClient.waitForTransactionReceipt({ hash: txHash });
	console.log(`Granted ATTESTER_ROLE to ${attesterWallet}`);

	txHash = await authority.write.grantRole([
		PERMISSION_ROLE,
		permissionManagerWallet,
		0,
	]);
	await publicClient.waitForTransactionReceipt({ hash: txHash });
	console.log(`Granted PERMISSION_ROLE to ${permissionManagerWallet}`);

	const selectors = [
		toFunctionSelector("createApplication((string, address))"),
		toFunctionSelector("updateApplication(uint256, (string, address))"),
		toFunctionSelector("deleteApplication(uint256)"),
	];

	txHash = await authority.write.setTargetFunctionRole([
		appManager.address,
		selectors,
		APP_MANAGER_ROLE,
	]);
	await publicClient.waitForTransactionReceipt({ hash: txHash });
	console.log("Set target functions for app manager");
}

main().catch(console.error);
