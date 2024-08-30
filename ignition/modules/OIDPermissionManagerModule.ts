import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const OIDPermissionManager = buildModule("OIDPermissionManager", (m) => {
	// const authority = m.getParameter("authority");
	const contract = m.contract("OIDPermissionManager", [], {});
	return { contract };
});

export default OIDPermissionManager;
