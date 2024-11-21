import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const OIDAccessManagerModule = buildModule("OIDAccessManagerModule", (m) => {
	const contract = m.contract("OIDAccessManager", [], {});
	m.call(contract, "initialize()", []);
	return { contract };
});

export default OIDAccessManagerModule;
