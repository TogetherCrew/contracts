import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const OIDAccessManagerModule = buildModule("OIDAccessManagerModule", (m) => {
	// const deployer = m.getAccount(0);

	const manager = m.contract("OIDAccessManager", [], {});
	m.call(manager, "initialize", []);

	// m.call(manager, "labelRole", [1n, "APP_MANAGER_ROLE"]);

	// console.log(appManager);
	// m.call(manager, "grantRole", [1n, appManager, 0]);

	return { manager };
});

export default OIDAccessManagerModule;
